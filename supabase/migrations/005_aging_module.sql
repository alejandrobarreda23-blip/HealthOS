-- Health OS v1.0 — Aging / Longevity module
create type public.aging_metric_kind as enum (
  'chronological_age','phenotypic_age','pace_of_aging','system_age','driver_score'
);
create type public.evidence_class as enum (
  'validated_external','published_formula','healthos_longitudinal','descriptive','insufficient'
);

create table if not exists public.aging_algorithm_registry (
  algorithm_key text primary key,
  display_name text not null,
  metric_kind public.aging_metric_kind not null,
  evidence_class public.evidence_class not null,
  description text not null,
  required_inputs jsonb not null default '[]'::jsonb,
  output_unit text not null,
  reference_citation text,
  implementation_version text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.aging_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_date date not null,
  algorithm_key text not null references public.aging_algorithm_registry(algorithm_key),
  value double precision,
  unit text not null,
  chronological_age double precision,
  age_gap_years double precision,
  confidence double precision check(confidence between 0 and 1),
  coverage double precision check(coverage between 0 and 1),
  evidence_class public.evidence_class not null,
  inputs_used jsonb not null default '{}'::jsonb,
  missing_inputs text[] not null default '{}',
  interpretation text,
  computation_version text not null,
  created_at timestamptz not null default now(),
  unique(user_id,assessment_date,algorithm_key,computation_version)
);

create table if not exists public.aging_drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_date date not null,
  driver_key text not null,
  domain text not null,
  direction text check(direction in ('favorable','neutral','unfavorable','unknown')),
  magnitude double precision,
  confidence double precision check(confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  computation_version text not null,
  created_at timestamptz not null default now(),
  unique(user_id,assessment_date,driver_key,computation_version)
);

alter table public.aging_assessments enable row level security;
alter table public.aging_drivers enable row level security;
create policy "own aging assessments" on public.aging_assessments for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "own aging drivers" on public.aging_drivers for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

insert into public.aging_algorithm_registry(
 algorithm_key,display_name,metric_kind,evidence_class,description,required_inputs,output_unit,reference_citation,implementation_version
) values
('chrono_age','Edad cronológica','chronological_age','descriptive',
 'Edad exacta derivada de fecha de nacimiento y fecha de evaluación.',
 '["date_of_birth","assessment_date"]','years',null,'chrono-v1'),
('phenoage_le_fi_2018','PhenoAge clínico','phenotypic_age','published_formula',
 'Implementación estricta de la fórmula clínica de Phenotypic Age. Requiere edad y nueve biomarcadores con unidades normalizadas.',
 '["age_years","albumin_g_l","creatinine_umol_l","glucose_mmol_l","crp_mg_dl","lymphocyte_percent","mcv_fl","rdw_percent","alkaline_phosphatase_u_l","wbc_10e3_ul"]',
 'years','Levine et al. Phenotypic Age','phenoage-v1'),
('dunedinpace_external','DunedinPACE','pace_of_aging','validated_external',
 'Resultado importado de un ensayo de metilación compatible. Health OS no lo reconstruye desde wearables.',
 '["external_dunedinpace_result"]','biological_years_per_chronological_year','Belsky et al. DunedinPACE','dunedinpace-import-v1'),
('healthos_pace','Health OS Longitudinal Pace','pace_of_aging','healthos_longitudinal',
 'Estimación propia del cambio longitudinal multissistema. No es DunedinPACE ni un reloj epigenético.',
 '["minimum_longitudinal_window","multi_system_features"]','relative_rate',null,'healthos-pace-v0')
on conflict(algorithm_key) do nothing;
