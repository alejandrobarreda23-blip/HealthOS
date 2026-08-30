-- Health OS v1.3 — Risk & Reference Engine
-- Converts raw/longitudinal metric values into contextualized, bounded signals
-- before those signals enter the System Evidence Engine.

create type public.reference_kind as enum (
  'clinical_threshold',
  'population_percentile',
  'age_sex_reference',
  'personal_baseline',
  'nonlinear_range',
  'contextual'
);

create table if not exists public.metric_reference_registry (
  reference_key text primary key,
  metric_key text not null,
  display_name text not null,
  reference_kind public.reference_kind not null,
  population_scope jsonb not null default '{}'::jsonb,
  value_unit text not null,
  curve jsonb not null,
  interpretation jsonb not null default '{}'::jsonb,
  reference_quality double precision not null check(reference_quality between 0 and 1),
  source_label text,
  source_url text,
  reference_version text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reference_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evaluated_at timestamptz not null default now(),
  metric_key text not null,
  reference_key text not null references public.metric_reference_registry(reference_key),
  observed_value double precision not null,
  unit text not null,
  contextual_percentile double precision check(contextual_percentile between 0 and 100),
  desirability_score double precision check(desirability_score between -1 and 1),
  normalized_signal double precision check(normalized_signal between -1 and 1),
  confidence double precision check(confidence between 0 and 1),
  context jsonb not null default '{}'::jsonb,
  explanation text,
  engine_version text not null
);

alter table public.reference_evaluations enable row level security;
create policy "own reference evaluations"
  on public.reference_evaluations for all
  using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- Conservative seed references. These are interpretation functions, not diagnostic cutoffs.
insert into public.metric_reference_registry
(reference_key,metric_key,display_name,reference_kind,population_scope,value_unit,curve,interpretation,reference_quality,source_label,reference_version)
values
('sbp_adult_context_v1','systolic_bp','Presión sistólica — contexto adulto','clinical_threshold',
 '{"age_min":18}',
 'mmHg',
 '{"type":"piecewise","points":[[90,0.35],[105,0.85],[115,1.0],[120,0.9],[130,0.45],[140,-0.2],[160,-0.8],[180,-1.0]]}',
 '{"note":"No convierte una lectura aislada en diagnóstico; exige serie y método válido."}',
 0.92,'Clinical blood-pressure risk framework','ref-v1'),

('sleep_duration_adult_v1','sleep_duration','Duración de sueño — rango adulto','nonlinear_range',
 '{"age_min":18}',
 'minutes',
 '{"type":"range","optimal":[420,540],"soft":[360,600],"hard":[300,660]}',
 '{"note":"Relación no lineal; sueño más largo no implica necesariamente mejor salud."}',
 0.78,'Adult sleep duration evidence framework','ref-v1'),

('resting_hr_personal_v1','resting_hr','FC reposo — baseline personal','personal_baseline',
 '{}',
 'bpm',
 '{"type":"personal_robust_z","direction":"lower_contextual","max_abs_z":3}',
 '{"note":"Prioriza desviación respecto a baseline estable sobre una población genérica."}',
 0.82,'Health OS personal-baseline model','ref-v1'),

('hrv_personal_v1','hrv_rmssd','HRV — baseline personal','personal_baseline',
 '{}',
 'ms',
 '{"type":"personal_robust_z","direction":"higher_contextual","max_abs_z":3}',
 '{"note":"HRV se interpreta principalmente respecto al propio baseline y contexto."}',
 0.82,'Health OS personal-baseline model','ref-v1'),

('vo2max_age_sex_v1','vo2max','VO2max — edad/sexo','age_sex_reference',
 '{}',
 'ml/kg/min',
 '{"type":"percentile_lookup","dataset":"external_required"}',
 '{"note":"Requiere tabla poblacional versionada compatible con edad, sexo y protocolo."}',
 0.0,'Reference dataset not yet installed','ref-v1'),

('glucose_fasting_adult_v1','glucose_fasting','Glucosa en ayunas — contexto','clinical_threshold',
 '{"age_min":18}',
 'mmol/L',
 '{"type":"piecewise","points":[[3.5,-0.7],[4.0,0.5],[4.6,1.0],[5.1,0.85],[5.6,0.35],[6.1,-0.25],[7.0,-0.85],[8.0,-1.0]]}',
 '{"note":"Señal orientativa para trayectoria metabólica; no sustituye diagnóstico."}',
 0.82,'Clinical glycaemia framework','ref-v1'),

('hba1c_adult_v1','hba1c','HbA1c — contexto','clinical_threshold',
 '{"age_min":18}',
 'percent',
 '{"type":"piecewise","points":[[4.0,0.55],[4.8,1.0],[5.3,0.9],[5.7,0.4],[6.0,0.0],[6.5,-0.7],[8.0,-1.0]]}',
 '{"note":"Relación contextual/no puramente lineal; considerar hematología y diabetes conocida."}',
 0.84,'Clinical HbA1c framework','ref-v1'),

('crp_baseline_v1','crp','CRP — inflamación basal','clinical_threshold',
 '{"context":"exclude_acute_illness_when_possible"}',
 'mg/L',
 '{"type":"piecewise","points":[[0.1,1.0],[1.0,0.8],[3.0,0.25],[5.0,-0.2],[10.0,-0.7],[20.0,-1.0]]}',
 '{"note":"CRP es inespecífica. Un episodio agudo debe reducir la confianza para envejecimiento basal."}',
 0.75,'Inflammation risk framework','ref-v1'),

('weight_personal_v1','weight','Peso — trayectoria personal','contextual',
 '{}',
 'kg',
 '{"type":"context_required"}',
 '{"note":"El peso por sí solo no tiene dirección favorable universal; requiere composición, cintura y objetivo/contexto."}',
 0.50,'Health OS contextual rule','ref-v1')
on conflict(reference_key) do update set
 curve=excluded.curve,interpretation=excluded.interpretation,
 reference_quality=excluded.reference_quality,
 source_label=excluded.source_label,
 reference_version=excluded.reference_version,updated_at=now();
