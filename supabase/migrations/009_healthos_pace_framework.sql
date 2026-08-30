-- Health OS v1.4 — Health OS Pace Framework
-- IMPORTANT: Health OS Pace is an experimental longitudinal index, NOT DunedinPACE,
-- biological years/year, lifespan prediction, diagnosis, or validated clinical endpoint.

create type public.pace_status as enum (
  'insufficient',
  'warming_up',
  'experimental',
  'stable_experimental',
  'calibration_required'
);

create table if not exists public.pace_model_registry (
  model_key text primary key,
  display_name text not null,
  status public.pace_status not null,
  description text not null,
  minimum_days integer not null,
  minimum_systems integer not null,
  minimum_independent_domains integer not null,
  minimum_coverage double precision not null,
  shrinkage_strength double precision not null,
  output_semantics text not null,
  model_spec jsonb not null,
  model_version text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pace_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_date date not null,
  model_key text not null references public.pace_model_registry(model_key),
  status public.pace_status not null,
  index_value double precision,
  confidence double precision not null check(confidence between 0 and 1),
  coverage double precision not null check(coverage between 0 and 1),
  days_observed integer not null,
  systems_used text[] not null default '{}',
  systems_excluded jsonb not null default '{}'::jsonb,
  independent_domains integer not null default 0,
  raw_signal double precision,
  shrunken_signal double precision,
  uncertainty_low double precision,
  uncertainty_high double precision,
  contributions jsonb not null default '[]'::jsonb,
  model_version text not null,
  created_at timestamptz not null default now(),
  unique(user_id,assessment_date,model_key,model_version)
);

alter table public.pace_assessments enable row level security;
create policy "own pace assessments" on public.pace_assessments for all
using(auth.uid()=user_id) with check(auth.uid()=user_id);

insert into public.pace_model_registry(
 model_key,display_name,status,description,minimum_days,minimum_systems,
 minimum_independent_domains,minimum_coverage,shrinkage_strength,
 output_semantics,model_spec,model_version
) values (
 'healthos_pace_experimental',
 'Health OS Pace — Experimental',
 'experimental',
 'Longitudinal multi-system health trajectory index. Never label as DunedinPACE or biological years/year.',
 365,4,4,0.70,0.60,
 '1.00 is an internal neutral anchor; values below/above 1 represent favorable/unfavorable longitudinal trajectory only after contextual normalization. This scale is NOT calibrated to chronological aging rate.',
 '{"system_weighting":"evidence_confidence_coverage","domain_cap":0.30,"winsorized_system_signal":0.50,"bootstrap_uncertainty":true,"neutral_anchor":1.0}',
 'healthos-pace-framework-v1'
)
on conflict(model_key) do update set
 model_spec=excluded.model_spec,model_version=excluded.model_version,
 description=excluded.description,output_semantics=excluded.output_semantics;
