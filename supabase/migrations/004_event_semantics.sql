-- Health OS v0.9 — Event Semantics + N-of-1 knowledge layer

create type public.hypothesis_status as enum ('candidate','testing','supported','weakened','rejected','retired');

alter table public.events
  add column if not exists duration_minutes integer,
  add column if not exists intensity text,
  add column if not exists context jsonb not null default '{}'::jsonb,
  add column if not exists tags text[] not null default '{}';

create table if not exists public.event_registry (
  event_type text primary key,
  display_name text not null,
  domain text not null,
  exposure_type text not null,
  description text,
  default_unit text,
  expected_windows jsonb not null default '[]'::jsonb,
  candidate_outcomes text[] not null default '{}',
  candidate_confounders text[] not null default '{}',
  capture_schema jsonb not null default '{}'::jsonb,
  registry_version text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_exposures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  exposure_key text not null,
  physiological_date date not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  value_numeric double precision,
  value_text text,
  value_boolean boolean,
  unit text,
  derivation_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(event_id,exposure_key,window_start,window_end,derivation_version)
);

create table if not exists public.associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exposure_key text not null,
  outcome_key text not null,
  analysis_window text not null,
  period_start date not null,
  period_end date not null,
  n_exposed integer not null,
  n_control integer not null,
  effect_type text not null,
  effect_value double precision,
  effect_unit text,
  confidence double precision check(confidence between 0 and 1),
  adjusted_for text[] not null default '{}',
  method text not null,
  analysis_version text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hypotheses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hypothesis_key text not null,
  title text not null,
  statement text not null,
  exposure_key text not null,
  outcome_key text not null,
  status public.hypothesis_status not null default 'candidate',
  confidence double precision check(confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  hypothesis_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,hypothesis_key)
);

alter table public.event_exposures enable row level security;
alter table public.associations enable row level security;
alter table public.hypotheses enable row level security;

create policy "own event exposures" on public.event_exposures for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "own associations" on public.associations for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "own hypotheses" on public.hypotheses for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

insert into public.event_registry(event_type,display_name,domain,exposure_type,default_unit,expected_windows,candidate_outcomes,candidate_confounders,capture_schema,registry_version)
values
('sauna','Sauna','recovery','behavioral','min',
 '[{"key":"acute_0_6h","hours":6},{"key":"overnight","anchor":"sleep"},{"key":"next_day","hours":24}]',
 array['hrv_rmssd','resting_hr','sleep_duration','sleep_efficiency','subjective_energy'],
 array['training_load','alcohol','illness','sleep_debt','altitude'],
 '{"duration_minutes":{"required":false},"intensity":{"enum":["low","medium","high"]},"temperature_c":{"required":false}}','events-v1'),
('meditation','Meditación','recovery','behavioral','min',
 '[{"key":"acute_0_3h","hours":3},{"key":"overnight","anchor":"sleep"}]',
 array['hrv_rmssd','resting_hr','sleep_latency','subjective_stress'],
 array['training_load','alcohol','illness','caffeine','sleep_debt'],
 '{"duration_minutes":{"required":false},"technique":{"enum":["breath","guided","body_scan","other"]}}','events-v1'),
('late_dinner','Cena tardía','nutrition','behavioral',null,
 '[{"key":"same_night","anchor":"sleep"},{"key":"next_morning","hours":12}]',
 array['hrv_rmssd','resting_hr','sleep_latency','sleep_efficiency','glucose'],
 array['alcohol','training_load','illness','meal_size','bedtime'],
 '{"meal_size":{"enum":["small","medium","large"]},"alcohol_with_meal":{"type":"boolean"}}','events-v1'),
('alcohol','Alcohol','nutrition','substance','standard_drink',
 '[{"key":"same_night","anchor":"sleep"},{"key":"next_day","hours":24}]',
 array['hrv_rmssd','resting_hr','sleep_efficiency','sleep_duration','subjective_energy'],
 array['training_load','illness','late_dinner','sleep_debt'],
 '{"quantity":{"required":true},"unit":{"default":"standard_drink"}}','events-v1'),
('illness','Enfermedad','health','state',null,
 '[{"key":"active","days":7}]',
 array['hrv_rmssd','resting_hr','sleep_duration','training_load','subjective_energy'],
 array[]::text[],
 '{"intensity":{"enum":["low","medium","high"]}}','events-v1')
on conflict(event_type) do update set
 display_name=excluded.display_name,domain=excluded.domain,exposure_type=excluded.exposure_type,
 expected_windows=excluded.expected_windows,candidate_outcomes=excluded.candidate_outcomes,
 candidate_confounders=excluded.candidate_confounders,capture_schema=excluded.capture_schema,
 registry_version=excluded.registry_version,updated_at=now();
