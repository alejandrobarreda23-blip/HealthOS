-- Health OS v1.1 — longitudinal physiological systems

create type public.system_status as enum ('insufficient','stable','improving','worsening','mixed');

create table if not exists public.aging_system_registry (
  system_key text primary key,
  display_name text not null,
  description text not null,
  required_metrics text[] not null default '{}',
  optional_metrics text[] not null default '{}',
  minimum_required_metrics integer not null default 1,
  minimum_days integer not null default 90,
  registry_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.aging_system_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_date date not null,
  system_key text not null references public.aging_system_registry(system_key),
  status public.system_status not null,
  score double precision,
  score_unit text,
  slope double precision,
  slope_unit text,
  confidence double precision not null check(confidence between 0 and 1),
  coverage double precision not null check(coverage between 0 and 1),
  days_observed integer not null,
  metrics_used text[] not null default '{}',
  missing_metrics text[] not null default '{}',
  evidence jsonb not null default '{}'::jsonb,
  computation_version text not null,
  created_at timestamptz not null default now(),
  unique(user_id,assessment_date,system_key,computation_version)
);

alter table public.aging_system_assessments enable row level security;
create policy "own aging system assessments"
  on public.aging_system_assessments for all
  using(auth.uid()=user_id) with check(auth.uid()=user_id);

insert into public.aging_system_registry(
 system_key,display_name,description,required_metrics,optional_metrics,
 minimum_required_metrics,minimum_days,registry_version
) values
('cardiovascular','Cardiovascular',
 'Presión arterial, frecuencia cardiaca y capacidad vascular/cardiaca observable.',
 array['resting_hr','systolic_bp'],
 array['diastolic_bp','hrv_rmssd','pulse_pressure','vo2max'],
 2,90,'systems-v1'),

('metabolic','Metabólico',
 'Control glucémico, perfil lipídico y señales metabólicas longitudinales.',
 array['glucose_fasting'],
 array['hba1c','triglycerides','hdl','ldl','apob','insulin_fasting','waist_cm','weight'],
 1,120,'systems-v1'),

('fitness','Fitness',
 'Capacidad cardiorrespiratoria y adaptación al entrenamiento.',
 array['vo2max'],
 array['threshold_hr','training_load','weekly_zone2_minutes','strength_sessions','pace_at_submax_hr'],
 1,90,'systems-v1'),

('sleep_recovery','Sueño y recuperación',
 'Duración, regularidad, eficiencia y recuperación autonómica.',
 array['sleep_duration','hrv_rmssd'],
 array['sleep_efficiency','sleep_regularity','resting_hr','sleep_latency','awake_minutes'],
 2,60,'systems-v1'),

('body_composition','Composición corporal',
 'Peso, grasa, perímetros y masa magra en tendencia.',
 array['weight'],
 array['body_fat_percent','waist_cm','lean_mass_kg','visceral_fat_index'],
 1,90,'systems-v1'),

('inflammation','Inflamación',
 'Inflamación sistémica medida principalmente mediante biomarcadores clínicos.',
 array['crp'],
 array['wbc','neutrophils','lymphocytes','esr'],
 1,180,'systems-v1'),

('renal','Renal',
 'Función renal longitudinal y estabilidad de marcadores relacionados.',
 array['creatinine'],
 array['egfr','cystatin_c','urea','urine_albumin_creatinine_ratio'],
 1,180,'systems-v1')
on conflict(system_key) do update set
 display_name=excluded.display_name,
 description=excluded.description,
 required_metrics=excluded.required_metrics,
 optional_metrics=excluded.optional_metrics,
 minimum_required_metrics=excluded.minimum_required_metrics,
 minimum_days=excluded.minimum_days,
 registry_version=excluded.registry_version;
