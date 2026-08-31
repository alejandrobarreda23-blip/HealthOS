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
