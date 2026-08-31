-- HealthOS V1.11 — one-shot reconciliation helper
-- Canonical migrations remain supabase/migrations/019..024.
-- This helper is for the current manually-managed Supabase project only.
-- It fails closed unless the verified V1.10.5 acquisition baseline is present.

begin;

do $healthos$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='metric_registry' and column_name='registry_status'
  ) then
    raise exception 'HealthOS V1.10.5 baseline not found: metric_registry.registry_status is missing';
  end if;

  if to_regclass('public.metric_acquisition_summary') is null then
    raise exception 'HealthOS V1.10.5 baseline not found: metric_acquisition_summary is missing';
  end if;

  if to_regclass('public.daily_features') is null or to_regclass('public.findings') is null then
    raise exception 'HealthOS core analysis tables are missing';
  end if;
end
$healthos$;

-- ============================================================
-- 019_daily_features_v1.sql
-- ============================================================

-- HealthOS v1.11.0 — Daily Features V1 (reconciled)
-- Deterministic provider-neutral daily features. Missing days remain missing.
create or replace function public.refresh_daily_features_v1()
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_direct integer:=0;
begin
 if v_user_id is null then raise exception 'Authenticated user required'; end if;
 delete from public.daily_features where user_id=v_user_id and computation_version='daily_features_v1';
 insert into public.daily_features(user_id,physiological_date,feature_key,value_numeric,unit,computation_version,source_window_start,source_window_end,sample_count,coverage_ratio,quality_score,metadata)
 select o.user_id,o.physiological_date,
  case o.metric_key when 'hrv_rmssd' then 'hrv_daily' when 'resting_heart_rate' then 'resting_hr_daily' when 'sleep_duration' then 'sleep_duration_minutes' when 'oxygen_saturation' then 'spo2_daily' when 'steps' then 'steps' end,
  avg(o.value_numeric),case o.metric_key when 'hrv_rmssd' then 'ms' when 'resting_heart_rate' then 'bpm' when 'sleep_duration' then 'min' when 'oxygen_saturation' then '%' when 'steps' then 'count' end,
  'daily_features_v1',min(o.started_at),max(coalesce(o.ended_at,o.started_at)),count(*)::int,1.0,avg(o.quality_score),jsonb_build_object('source','observations','provider_neutral',true)
 from public.observations o where o.user_id=v_user_id and o.metric_key in('hrv_rmssd','resting_heart_rate','sleep_duration','oxygen_saturation','steps')
 group by o.user_id,o.physiological_date,o.metric_key;
 get diagnostics v_direct=row_count;
 insert into public.daily_features(user_id,physiological_date,feature_key,value_numeric,unit,computation_version,sample_count,coverage_ratio,quality_score,metadata)
 select user_id,physiological_date,feature_key,value_numeric,unit,'daily_features_v1',sample_count,1.0,null,jsonb_build_object('source','exercise_sessions','provider_neutral',true)
 from(
  select user_id,physiological_date,'exercise_count' feature_key,count(*)::float8 value_numeric,'count' unit,count(*)::int sample_count from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
  union all select user_id,physiological_date,'training_duration_minutes',sum(extract(epoch from(ended_at-started_at))/60.0),'min',count(*)::int from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
  union all select user_id,physiological_date,'training_distance_km',sum(coalesce(distance_m,0))/1000.0,'km',count(*)::int from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
  union all select user_id,physiological_date,'training_elevation_gain_m',sum(coalesce(elevation_gain_m,0)),'m',count(*)::int from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
  union all select user_id,physiological_date,'training_energy_kcal',sum(coalesce(active_energy_kcal,0)),'kcal',count(*)::int from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
 )x;
 insert into public.daily_features(user_id,physiological_date,feature_key,value_numeric,unit,computation_version,sample_count,coverage_ratio,quality_score,metadata)
 select v_user_id,d.physiological_date,'data_quality',count(*) filter(where f.feature_key in('hrv_daily','resting_hr_daily','sleep_duration_minutes','spo2_daily','steps'))::float8/5.0,'ratio','daily_features_v1',count(*) filter(where f.feature_key in('hrv_daily','resting_hr_daily','sleep_duration_minutes','spo2_daily','steps'))::int,count(*) filter(where f.feature_key in('hrv_daily','resting_hr_daily','sleep_duration_minutes','spo2_daily','steps'))::float8/5.0,count(*) filter(where f.feature_key in('hrv_daily','resting_hr_daily','sleep_duration_minutes','spo2_daily','steps'))::float8/5.0,jsonb_build_object('expected_metrics',5,'missing_is_not_imputed',true)
 from(select distinct physiological_date from public.daily_features where user_id=v_user_id and computation_version='daily_features_v1')d
 join public.daily_features f on f.user_id=v_user_id and f.physiological_date=d.physiological_date and f.computation_version='daily_features_v1'
 group by d.physiological_date;
 return jsonb_build_object('ok',true,'computation_version','daily_features_v1','direct_features_inserted',v_direct);
end $$;
revoke all on function public.refresh_daily_features_v1() from public;
grant execute on function public.refresh_daily_features_v1() to authenticated;

-- ============================================================
-- 020_metric_dictionary_v1.sql
-- ============================================================

-- HealthOS v1.11.0 — Metric Dictionary V1 (reconciled)
-- Align subjective units with the current 1–5 check-in UI and register training metrics used by the longitudinal engine.
update public.metric_registry set canonical_unit='score_1_5' where metric_key in ('energy_score','stress_score','mood_score','fatigue_score');
insert into public.metric_registry(metric_key,display_name,domain,canonical_unit,default_assignment_rule) values
('training_duration','Training Duration','training','min','start_date'),
('training_distance','Training Distance','training','km','start_date'),
('training_load','Training Load','training','AU','start_date')
on conflict(metric_key) do nothing;

create table if not exists public.metric_semantics_registry (
  metric_key text primary key references public.metric_registry(metric_key) on delete cascade,
  semantic_definition text not null,
  data_level health_data_level not null,
  measurement_family text not null,
  preferred_sources text[] not null default '{}',
  source_equivalence_policy text not null check (source_equivalence_policy in ('directly_comparable','device_transition_sensitive','provider_algorithm_sensitive','not_comparable_without_calibration')),
  physiological_day_rule health_assignment_rule not null,
  plausible_min double precision,
  plausible_max double precision,
  baseline_window_days integer not null check (baseline_window_days > 0),
  baseline_min_samples integer not null check (baseline_min_samples >= 0),
  baseline_min_coverage double precision not null check (baseline_min_coverage between 0 and 1),
  aggregation_method text not null check (aggregation_method in ('median','mean','sum','last')),
  comparison_direction text not null check (comparison_direction in ('higher_favorable','lower_favorable','target_range','context_dependent','neutral')),
  missingness_policy text not null check (missingness_policy in ('preserve_gap','not_expected_daily')),
  registry_version text not null default 'metric_dictionary_v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plausible_min is null or plausible_max is null or plausible_max > plausible_min)
);

drop trigger if exists trg_metric_semantics_updated_at on public.metric_semantics_registry;
create trigger trg_metric_semantics_updated_at before update on public.metric_semantics_registry for each row execute function public.set_updated_at();

alter table public.metric_semantics_registry enable row level security;
drop policy if exists "read only registry" on public.metric_semantics_registry;
create policy "read only registry" on public.metric_semantics_registry for select to authenticated using (true);

insert into public.metric_semantics_registry(metric_key,semantic_definition,data_level,measurement_family,preferred_sources,source_equivalence_policy,physiological_day_rule,plausible_min,plausible_max,baseline_window_days,baseline_min_samples,baseline_min_coverage,aggregation_method,comparison_direction,missingness_policy)
values
('hrv_rmssd','Resumen diario/nocturno de HRV expresada como RMSSD.','derived','autonomic_recovery',array['intervals_icu','oura','ultrahuman','suunto','health_connect'],'device_transition_sensitive','wake_date',5,300,42,20,.5,'median','higher_favorable','preserve_gap'),
('resting_heart_rate','Frecuencia cardiaca de reposo resumida por proveedor o algoritmo.','derived','cardiovascular_recovery',array['intervals_icu','oura','ultrahuman','suunto','health_connect'],'provider_algorithm_sensitive','wake_date',25,140,42,20,.5,'median','lower_favorable','preserve_gap'),
('sleep_duration','Duración total de sueño atribuida al día fisiológico de despertar.','derived','sleep',array['intervals_icu','oura','ultrahuman','suunto','health_connect'],'provider_algorithm_sensitive','wake_date',30,900,42,20,.5,'median','context_dependent','preserve_gap'),
('oxygen_saturation','SpO2 resumida para el periodo de medición.','derived','respiratory',array['intervals_icu','oura','ultrahuman','suunto','health_connect'],'provider_algorithm_sensitive','wake_date',70,100,42,20,.5,'median','target_range','preserve_gap'),
('steps','Número de pasos atribuidos al día fisiológico.','derived','activity',array['intervals_icu','health_connect','suunto','oura','ultrahuman'],'provider_algorithm_sensitive','provider_date',0,100000,28,14,.5,'median','context_dependent','preserve_gap'),
('weight','Peso corporal medido.','measured','body_composition',array['withings','health_connect','manual'],'directly_comparable','measurement_local_date',25,300,42,8,.15,'median','context_dependent','not_expected_daily'),
('systolic_blood_pressure','Presión arterial sistólica medida.','measured','blood_pressure',array['withings','health_connect','manual'],'directly_comparable','measurement_local_date',60,260,42,8,.15,'median','target_range','not_expected_daily'),
('diastolic_blood_pressure','Presión arterial diastólica medida.','measured','blood_pressure',array['withings','health_connect','manual'],'directly_comparable','measurement_local_date',30,180,42,8,.15,'median','target_range','not_expected_daily')
on conflict(metric_key) do update set
 semantic_definition=excluded.semantic_definition,data_level=excluded.data_level,measurement_family=excluded.measurement_family,preferred_sources=excluded.preferred_sources,source_equivalence_policy=excluded.source_equivalence_policy,physiological_day_rule=excluded.physiological_day_rule,plausible_min=excluded.plausible_min,plausible_max=excluded.plausible_max,baseline_window_days=excluded.baseline_window_days,baseline_min_samples=excluded.baseline_min_samples,baseline_min_coverage=excluded.baseline_min_coverage,aggregation_method=excluded.aggregation_method,comparison_direction=excluded.comparison_direction,missingness_policy=excluded.missingness_policy,registry_version='metric_dictionary_v1';

-- ============================================================
-- 021_baseline_engine_v1.sql
-- ============================================================

-- HealthOS v1.11.0 — Baseline persistence V1 (reconciled)
create table if not exists public.metric_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text not null references public.metric_registry(metric_key),
  as_of_date date not null,
  baseline_kind text not null check (baseline_kind in ('all_contexts','reference','contextual')),
  context_key text,
  window_days integer not null,
  sample_count integer not null,
  expected_days integer not null,
  coverage_ratio double precision not null check (coverage_ratio between 0 and 1),
  median_value double precision,
  mad_value double precision,
  p10 double precision,
  p25 double precision,
  p50 double precision,
  p75 double precision,
  p90 double precision,
  evidence_strength text not null check (evidence_strength in ('INSUFFICIENT','LOW','MODERATE','HIGH')),
  sufficient boolean not null,
  excluded_sample_count integer not null default 0,
  exclusion_reasons jsonb not null default '{}'::jsonb,
  algorithm_version text not null default 'baseline_v1',
  created_at timestamptz not null default now(),
  unique(user_id,metric_key,as_of_date,baseline_kind,context_key,algorithm_version)
);
create index if not exists idx_metric_baselines_user_metric_date on public.metric_baselines(user_id,metric_key,as_of_date desc);
alter table public.metric_baselines enable row level security;
drop policy if exists "own_metric_baselines" on public.metric_baselines;
create policy "own_metric_baselines" on public.metric_baselines for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- ============================================================
-- 022_finding_registry_v1.sql
-- ============================================================

-- HealthOS v1.11.0 — Finding Registry V1 (reconciled)
create table if not exists public.finding_registry (
  finding_key text primary key,
  domain text not null,
  title text not null,
  description text not null,
  input_metrics text[] not null default '{}',
  recent_window_days integer not null,
  baseline_window_days integer,
  minimum_recent_samples integer not null default 0,
  minimum_baseline_samples integer,
  confounders text[] not null default '{}',
  interpretation_boundary text not null,
  detector_version text not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_finding_registry_updated_at on public.finding_registry;
create trigger trg_finding_registry_updated_at before update on public.finding_registry for each row execute function public.set_updated_at();
alter table public.finding_registry enable row level security;
drop policy if exists "read only registry" on public.finding_registry;
create policy "read only registry" on public.finding_registry for select to authenticated using(true);

alter table public.findings add column if not exists evidence_strength text check (evidence_strength is null or evidence_strength in ('INSUFFICIENT','LOW','MODERATE','HIGH'));
alter table public.findings add column if not exists observed_value double precision;
alter table public.findings add column if not exists reference_value double precision;
alter table public.findings add column if not exists effect_size double precision;
alter table public.findings add column if not exists robust_z double precision;
alter table public.findings add column if not exists sample_count integer;
alter table public.findings add column if not exists coverage_ratio double precision check (coverage_ratio is null or coverage_ratio between 0 and 1);
alter table public.findings add column if not exists interpretation_boundary text;

insert into public.finding_registry(finding_key,domain,title,description,input_metrics,recent_window_days,baseline_window_days,minimum_recent_samples,minimum_baseline_samples,confounders,interpretation_boundary,detector_version)
values
('sustained_hrv_drop','recovery','HRV sostenidamente inferior a tu referencia','Mediana reciente de HRV por debajo del baseline personal con cobertura suficiente.',array['hrv_rmssd'],7,42,4,20,array['illness','training_load','alcohol','travel','sleep','source_transition'],'Detecta una desviación longitudinal reproducible. No establece por sí sola causa, diagnóstico ni recomendación médica.','sustained_hrv_drop_v2'),
('sustained_rhr_elevation','recovery','FC de reposo sostenidamente superior a tu referencia','FC de reposo reciente elevada frente al baseline personal.',array['resting_heart_rate'],7,42,4,20,array['illness','training_load','alcohol','travel','sleep','heat','source_transition'],'Detecta una desviación longitudinal reproducible. No establece por sí sola causa, diagnóstico ni recomendación médica.','sustained_rhr_elevation_v1'),
('recovery_concordance','recovery','Marcadores de recuperación desplazados de forma concordante','HRV inferior y FC de reposo superior simultáneamente.',array['hrv_rmssd','resting_heart_rate'],7,42,4,20,array['illness','training_load','alcohol','travel','sleep','source_transition'],'Detecta una desviación longitudinal reproducible. No establece por sí sola causa, diagnóstico ni recomendación médica.','recovery_concordance_v1'),
('sleep_deficit','sleep','Sueño reciente inferior a tu referencia','Duración de sueño reciente inferior al baseline personal.',array['sleep_duration'],7,42,4,20,array['travel','late_dinner','alcohol','illness','source_transition'],'Detecta una desviación longitudinal reproducible. No establece por sí sola causa, diagnóstico ni recomendación médica.','sleep_deficit_v1'),
('acute_training_load_increase','training','Aumento reciente de carga de entrenamiento','La carga reciente ha aumentado frente a la referencia de entrenamiento.',array['training_load'],7,28,1,8,array['sport_mix','source_transition'],'Describe cambio de carga. No convierte un ratio en una zona clínica de seguridad o riesgo.','acute_training_load_increase_v1'),
('recovery_load_mismatch','training_recovery','Carga y recuperación se desplazan en direcciones opuestas','Aumento de carga junto con desplazamiento desfavorable de HRV y/o FC de reposo.',array['training_load','hrv_rmssd','resting_heart_rate'],7,42,4,20,array['illness','sleep','alcohol','travel','source_transition'],'Detecta una desviación longitudinal reproducible. No establece por sí sola causa, diagnóstico ni recomendación médica.','recovery_load_mismatch_v1'),
('weight_trend','body','Cambio sostenido de tendencia de peso','Tendencia de varias semanas, no oscilación diaria aislada.',array['weight'],28,90,4,8,array['hydration','measurement_device','time_of_day'],'Detecta una desviación longitudinal reproducible. No establece por sí sola causa, diagnóstico ni recomendación médica.','weight_trend_v1'),
('spo2_deviation','respiratory','SpO₂ inferior a tu distribución habitual','Desviación longitudinal de SpO₂ respecto de referencia personal.',array['oxygen_saturation'],7,42,4,20,array['altitude','illness','sensor_quality','source_transition'],'Detecta desviación personal. No diagnostica apnea, hipoxemia ni enfermedad.','spo2_deviation_v1'),
('insufficient_recent_data','data_quality','Datos recientes insuficientes','Cobertura insuficiente para sostener inferencias longitudinales recientes.',array[]::text[],7,null,0,null,array['device_not_worn','source_not_synced','permission_missing','unknown'],'Es un hallazgo de calidad de datos, no fisiológico.','insufficient_recent_data_v1'),
('source_discontinuity','data_quality','Cambio de fuente de medición','Cambio de dispositivo/proveedor potencialmente relevante para comparabilidad longitudinal.',array[]::text[],1,null,0,null,array[]::text[],'Señala posible discontinuidad metrológica; no implica un cambio fisiológico.','source_discontinuity_v1')
on conflict(finding_key) do update set domain=excluded.domain,title=excluded.title,description=excluded.description,input_metrics=excluded.input_metrics,recent_window_days=excluded.recent_window_days,baseline_window_days=excluded.baseline_window_days,minimum_recent_samples=excluded.minimum_recent_samples,minimum_baseline_samples=excluded.minimum_baseline_samples,confounders=excluded.confounders,interpretation_boundary=excluded.interpretation_boundary,detector_version=excluded.detector_version,active=true;

-- ============================================================
-- 023_missingness_source_continuity_v1.sql
-- ============================================================

-- HealthOS v1.11.0 — Missingness and source transition persistence (reconciled)
create table if not exists public.missingness_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  physiological_date date not null,
  metric_key text references public.metric_registry(metric_key),
  reason text not null check (reason in ('device_not_worn','source_not_synced','metric_not_supported','permission_missing','bad_data','unknown')),
  source_provider text,
  evidence jsonb not null default '{}'::jsonb,
  annotation_level health_data_level not null default 'inferred',
  algorithm_version text not null default 'missingness_v1',
  created_at timestamptz not null default now(),
  unique(user_id,physiological_date,metric_key,source_provider,algorithm_version)
);
create table if not exists public.source_continuity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text references public.metric_registry(metric_key),
  effective_date date not null,
  previous_source text,
  new_source text not null,
  event_type text not null check (event_type in ('device_change','provider_change','algorithm_change','firmware_change','unknown_transition')),
  comparability text not null check (comparability in ('likely_comparable','transition_sensitive','requires_calibration','unknown')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_missingness_user_date on public.missingness_annotations(user_id,physiological_date desc);
create index if not exists idx_source_continuity_user_metric_date on public.source_continuity_events(user_id,metric_key,effective_date desc);
alter table public.missingness_annotations enable row level security;
alter table public.source_continuity_events enable row level security;
drop policy if exists "own_missingness_annotations" on public.missingness_annotations;
create policy "own_missingness_annotations" on public.missingness_annotations for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own_source_continuity_events" on public.source_continuity_events;
create policy "own_source_continuity_events" on public.source_continuity_events for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- ============================================================
-- 024_health_brief_runtime_v1.sql
-- ============================================================

-- HealthOS v1.11.0 — Persisted Health Brief + generated-finding identity.

create table if not exists public.health_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  physiological_date date not null,
  brief_version text not null,
  payload jsonb not null,
  overall_coverage double precision check (overall_coverage between 0 and 1),
  evidence_strength text check (evidence_strength is null or evidence_strength in ('INSUFFICIENT','LOW','MODERATE','HIGH')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, physiological_date, brief_version)
);

create index if not exists idx_health_briefs_user_date
  on public.health_briefs(user_id, physiological_date desc);

drop trigger if exists trg_health_briefs_updated_at on public.health_briefs;
create trigger trg_health_briefs_updated_at
before update on public.health_briefs
for each row execute function public.set_updated_at();

alter table public.health_briefs enable row level security;
drop policy if exists "own_health_briefs" on public.health_briefs;
create policy "own_health_briefs" on public.health_briefs
for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- A deterministic detector can be rerun without duplicating the same finding window.
create unique index if not exists uq_findings_generated_identity
  on public.findings(user_id, finding_key, period_end, detector_version);

-- Idempotent source-transition persistence.
create unique index if not exists uq_source_continuity_identity
  on public.source_continuity_events(user_id, metric_key, effective_date, previous_source, new_source, event_type);

commit;
