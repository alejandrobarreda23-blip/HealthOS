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
