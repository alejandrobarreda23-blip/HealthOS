-- Health OS v0.1
-- Supabase / PostgreSQL
-- Initial longitudinal health schema

create extension if not exists pgcrypto;

-- ---------- ENUMS ----------

do $$ begin
  create type health_data_level as enum ('measured', 'derived', 'reported', 'inferred');
exception when duplicate_object then null; end $$;

do $$ begin
  create type health_source_type as enum ('wearable', 'device', 'manual', 'laboratory', 'document', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type health_assignment_rule as enum (
    'measurement_local_date',
    'start_date',
    'end_date',
    'wake_date',
    'provider_date'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type canonical_record_type as enum (
    'observation',
    'sleep_session',
    'exercise_session',
    'event'
  );
exception when duplicate_object then null; end $$;

-- ---------- UPDATED_AT ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- METRIC REGISTRY ----------

create table if not exists public.metric_registry (
  metric_key text primary key,
  display_name text not null,
  domain text not null,
  canonical_unit text,
  data_type text not null default 'numeric',
  default_assignment_rule health_assignment_rule not null default 'measurement_local_date',
  metric_definition_version text not null default '1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_metric_registry_updated_at on public.metric_registry;
create trigger trg_metric_registry_updated_at
before update on public.metric_registry
for each row execute function public.set_updated_at();

-- ---------- RAW SOURCE RECORDS ----------

create table if not exists public.source_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  provider text not null,
  source_type health_source_type not null,
  record_type text not null,
  external_id text not null,

  source_schema_version text,
  received_at timestamptz not null default now(),
  source_updated_at timestamptz,

  payload jsonb not null,
  payload_hash text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, provider, record_type, external_id)
);

create index if not exists idx_source_records_user_received
  on public.source_records(user_id, received_at desc);

create index if not exists idx_source_records_provider
  on public.source_records(user_id, provider, record_type);

drop trigger if exists trg_source_records_updated_at on public.source_records;
create trigger trg_source_records_updated_at
before update on public.source_records
for each row execute function public.set_updated_at();

-- ---------- MEASUREMENT GROUPS ----------

create table if not exists public.measurement_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_type text not null,
  measured_at timestamptz not null,
  timezone text,
  utc_offset_minutes integer,
  source_record_id uuid references public.source_records(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- OBSERVATIONS ----------

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  metric_key text not null references public.metric_registry(metric_key),
  value_numeric double precision,
  value_text text,
  value_boolean boolean,
  unit text,

  started_at timestamptz not null,
  ended_at timestamptz,

  timezone text,
  utc_offset_minutes integer,
  physiological_date date not null,
  assignment_rule health_assignment_rule not null,

  provider text not null,
  source_type health_source_type not null,
  source_device text,
  measurement_method text,

  data_level health_data_level not null,
  quality_score double precision check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),

  measurement_group_id uuid references public.measurement_groups(id) on delete set null,
  source_record_id uuid references public.source_records(id) on delete set null,

  external_observation_id text,
  normalizer_version text not null default '1',
  algorithm_version text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    ((value_numeric is not null)::int +
     (value_text is not null)::int +
     (value_boolean is not null)::int) = 1
  )
);

create index if not exists idx_observations_user_metric_time
  on public.observations(user_id, metric_key, started_at desc);

create index if not exists idx_observations_user_phys_day
  on public.observations(user_id, physiological_date desc);

create unique index if not exists uq_observation_provider_external
  on public.observations(user_id, provider, external_observation_id)
  where external_observation_id is not null;

drop trigger if exists trg_observations_updated_at on public.observations;
create trigger trg_observations_updated_at
before update on public.observations
for each row execute function public.set_updated_at();

-- ---------- SLEEP ----------

create table if not exists public.sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  started_at timestamptz not null,
  ended_at timestamptz not null,
  timezone text,
  utc_offset_minutes integer,
  physiological_date date not null,
  assignment_rule health_assignment_rule not null default 'wake_date',

  provider text not null,
  source_device text,
  data_level health_data_level not null default 'measured',
  quality_score double precision check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),

  source_record_id uuid references public.source_records(id) on delete set null,
  external_session_id text,
  normalizer_version text not null default '1',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ended_at > started_at)
);

create unique index if not exists uq_sleep_provider_external
  on public.sleep_sessions(user_id, provider, external_session_id)
  where external_session_id is not null;

create index if not exists idx_sleep_user_phys_day
  on public.sleep_sessions(user_id, physiological_date desc);

drop trigger if exists trg_sleep_sessions_updated_at on public.sleep_sessions;
create trigger trg_sleep_sessions_updated_at
before update on public.sleep_sessions
for each row execute function public.set_updated_at();

create table if not exists public.sleep_stages (
  id uuid primary key default gen_random_uuid(),
  sleep_session_id uuid not null references public.sleep_sessions(id) on delete cascade,
  stage text not null check (stage in ('awake','light','deep','rem','unknown')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  source_record_id uuid references public.source_records(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ended_at > started_at)
);

create index if not exists idx_sleep_stages_session_time
  on public.sleep_stages(sleep_session_id, started_at);

-- ---------- EXERCISE ----------

create table if not exists public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  activity_type text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  timezone text,
  utc_offset_minutes integer,
  physiological_date date not null,
  assignment_rule health_assignment_rule not null default 'start_date',

  provider text not null,
  source_device text,
  source_record_id uuid references public.source_records(id) on delete set null,
  external_session_id text,

  distance_m double precision,
  elevation_gain_m double precision,
  active_energy_kcal double precision,
  avg_heart_rate_bpm double precision,
  max_heart_rate_bpm double precision,

  data_level health_data_level not null default 'measured',
  quality_score double precision check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),
  normalizer_version text not null default '1',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ended_at > started_at)
);

create unique index if not exists uq_exercise_provider_external
  on public.exercise_sessions(user_id, provider, external_session_id)
  where external_session_id is not null;

create index if not exists idx_exercise_user_time
  on public.exercise_sessions(user_id, started_at desc);

drop trigger if exists trg_exercise_sessions_updated_at on public.exercise_sessions;
create trigger trg_exercise_sessions_updated_at
before update on public.exercise_sessions
for each row execute function public.set_updated_at();

-- ---------- GENERIC SERIES ----------

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  series_type text not null,
  metric_key text references public.metric_registry(metric_key),
  provider text not null,
  source_device text,
  started_at timestamptz not null,
  ended_at timestamptz,
  source_record_id uuid references public.source_records(id) on delete set null,
  external_series_id text,
  sampling_hz double precision,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_series_provider_external
  on public.series(user_id, provider, external_series_id)
  where external_series_id is not null;

create table if not exists public.series_points (
  series_id uuid not null references public.series(id) on delete cascade,
  ts timestamptz not null,
  value double precision not null,
  quality_score double precision check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),
  primary key (series_id, ts)
);

-- ---------- EVENTS ----------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  event_type text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  timezone text,
  utc_offset_minutes integer,
  physiological_date date not null,
  assignment_rule health_assignment_rule not null default 'start_date',

  provider text not null default 'manual',
  source_type health_source_type not null default 'manual',
  data_level health_data_level not null default 'reported',

  intensity double precision,
  quantity double precision,
  unit text,
  note text,

  source_record_id uuid references public.source_records(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_events_user_day
  on public.events(user_id, physiological_date desc, event_type);

-- ---------- SUBJECTIVE DAILY REPORT ----------

create table if not exists public.subjective_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  physiological_date date not null,

  energy_score smallint check (energy_score between 0 and 10),
  stress_score smallint check (stress_score between 0 and 10),
  mood_score smallint check (mood_score between 0 and 10),
  fatigue_score smallint check (fatigue_score between 0 and 10),
  pain_score smallint check (pain_score between 0 and 10),
  hunger_score smallint check (hunger_score between 0 and 10),
  concentration_score smallint check (concentration_score between 0 and 10),

  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, physiological_date)
);

drop trigger if exists trg_subjective_reports_updated_at on public.subjective_reports;
create trigger trg_subjective_reports_updated_at
before update on public.subjective_reports
for each row execute function public.set_updated_at();

-- ---------- SOURCE PRIORITY ----------

create table if not exists public.source_priority_registry (
  id bigserial primary key,
  metric_key text not null references public.metric_registry(metric_key),
  provider text not null,
  priority integer not null check (priority > 0),
  enabled boolean not null default true,
  rationale text,
  created_at timestamptz not null default now(),
  unique (metric_key, provider)
);

-- ---------- CANONICAL RECONCILIATION ----------

create table if not exists public.canonical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type canonical_record_type not null,

  metric_key text references public.metric_registry(metric_key),
  physiological_date date,
  started_at timestamptz,
  ended_at timestamptz,

  reconciliation_key text,
  reconciliation_version text not null default '1',
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_canonical_user_day
  on public.canonical_records(user_id, physiological_date desc);

drop trigger if exists trg_canonical_records_updated_at on public.canonical_records;
create trigger trg_canonical_records_updated_at
before update on public.canonical_records
for each row execute function public.set_updated_at();

create table if not exists public.canonical_record_sources (
  canonical_record_id uuid not null references public.canonical_records(id) on delete cascade,
  source_kind canonical_record_type not null,
  source_entity_id uuid not null,
  provider text not null,
  priority integer,
  is_preferred boolean not null default false,
  match_score double precision check (match_score is null or (match_score >= 0 and match_score <= 1)),
  created_at timestamptz not null default now(),
  primary key (canonical_record_id, source_kind, source_entity_id)
);

-- ---------- MEDICAL DOCUMENTS / RESULTS ----------

create table if not exists public.medical_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_date date,
  storage_path text not null,
  sha256 text not null,
  extraction_status text not null default 'pending',
  extraction_version text,
  created_at timestamptz not null default now(),
  unique (user_id, sha256)
);

create table if not exists public.medical_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medical_document_id uuid not null references public.medical_documents(id) on delete cascade,
  metric_key text not null references public.metric_registry(metric_key),
  value_numeric double precision,
  value_text text,
  unit text,
  reference_low double precision,
  reference_high double precision,
  abnormal_flag text,
  collected_at timestamptz,
  physiological_date date,
  evidence_locator jsonb,
  extraction_confidence double precision check (
    extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)
  ),
  created_at timestamptz not null default now(),
  check (((value_numeric is not null)::int + (value_text is not null)::int) = 1)
);

-- ---------- SEED METRICS ----------

insert into public.metric_registry
(metric_key, display_name, domain, canonical_unit, default_assignment_rule)
values
('heart_rate','Heart Rate','cardiovascular','bpm','measurement_local_date'),
('resting_heart_rate','Resting Heart Rate','cardiovascular','bpm','measurement_local_date'),
('hrv_rmssd','HRV RMSSD','recovery','ms','wake_date'),
('respiratory_rate','Respiratory Rate','respiratory','breaths/min','wake_date'),
('oxygen_saturation','Oxygen Saturation','respiratory','%','measurement_local_date'),
('systolic_blood_pressure','Systolic Blood Pressure','cardiovascular','mmHg','measurement_local_date'),
('diastolic_blood_pressure','Diastolic Blood Pressure','cardiovascular','mmHg','measurement_local_date'),

('sleep_duration','Sleep Duration','sleep','min','wake_date'),
('sleep_efficiency','Sleep Efficiency','sleep','%','wake_date'),
('sleep_latency','Sleep Latency','sleep','min','wake_date'),
('wake_after_sleep_onset','Wake After Sleep Onset','sleep','min','wake_date'),
('rem_duration','REM Duration','sleep','min','wake_date'),
('deep_sleep_duration','Deep Sleep Duration','sleep','min','wake_date'),
('light_sleep_duration','Light Sleep Duration','sleep','min','wake_date'),

('skin_temperature','Skin Temperature','temperature','degC','measurement_local_date'),
('body_temperature','Body Temperature','temperature','degC','measurement_local_date'),
('temperature_deviation','Temperature Deviation','temperature','degC','wake_date'),

('steps','Steps','activity','count','measurement_local_date'),
('distance','Distance','activity','m','measurement_local_date'),
('active_energy','Active Energy','activity','kcal','measurement_local_date'),
('total_energy','Total Energy','activity','kcal','measurement_local_date'),
('vo2max','VO2 Max','fitness','ml/kg/min','measurement_local_date'),
('elevation_gain','Elevation Gain','activity','m','measurement_local_date'),

('weight','Weight','body_composition','kg','measurement_local_date'),
('body_fat_percentage','Body Fat Percentage','body_composition','%','measurement_local_date'),
('lean_mass','Lean Mass','body_composition','kg','measurement_local_date'),
('muscle_mass','Muscle Mass','body_composition','kg','measurement_local_date'),
('visceral_fat_index','Visceral Fat Index','body_composition',null,'measurement_local_date'),

('glucose','Glucose','metabolic','mg/dL','measurement_local_date'),
('hba1c','HbA1c','metabolic','%','measurement_local_date'),
('insulin','Insulin','metabolic','uIU/mL','measurement_local_date'),
('total_cholesterol','Total Cholesterol','lipids','mg/dL','measurement_local_date'),
('ldl_cholesterol','LDL Cholesterol','lipids','mg/dL','measurement_local_date'),
('hdl_cholesterol','HDL Cholesterol','lipids','mg/dL','measurement_local_date'),
('triglycerides','Triglycerides','lipids','mg/dL','measurement_local_date'),
('apob','ApoB','lipids','mg/dL','measurement_local_date'),
('ferritin','Ferritin','hematology','ng/mL','measurement_local_date'),
('iron','Iron','hematology','ug/dL','measurement_local_date'),
('vitamin_b12','Vitamin B12','nutrition','pg/mL','measurement_local_date'),
('folate','Folate','nutrition','ng/mL','measurement_local_date'),
('vitamin_d','Vitamin D','nutrition','ng/mL','measurement_local_date'),
('creatinine','Creatinine','renal','mg/dL','measurement_local_date'),
('egfr','eGFR','renal','mL/min/1.73m2','measurement_local_date'),
('alt','ALT','hepatic','U/L','measurement_local_date'),
('ast','AST','hepatic','U/L','measurement_local_date'),
('ggt','GGT','hepatic','U/L','measurement_local_date'),
('tsh','TSH','thyroid','mIU/L','measurement_local_date'),
('crp','C-Reactive Protein','inflammation','mg/L','measurement_local_date'),

('energy_score','Energy Score','subjective','score_0_10','measurement_local_date'),
('stress_score','Stress Score','subjective','score_0_10','measurement_local_date'),
('mood_score','Mood Score','subjective','score_0_10','measurement_local_date'),
('fatigue_score','Fatigue Score','subjective','score_0_10','measurement_local_date'),
('pain_score','Pain Score','subjective','score_0_10','measurement_local_date'),
('hunger_score','Hunger Score','subjective','score_0_10','measurement_local_date'),
('concentration_score','Concentration Score','subjective','score_0_10','measurement_local_date')
on conflict (metric_key) do nothing;

-- ---------- RLS ----------

alter table public.source_records enable row level security;
alter table public.measurement_groups enable row level security;
alter table public.observations enable row level security;
alter table public.sleep_sessions enable row level security;
alter table public.sleep_stages enable row level security;
alter table public.exercise_sessions enable row level security;
alter table public.series enable row level security;
alter table public.series_points enable row level security;
alter table public.events enable row level security;
alter table public.subjective_reports enable row level security;
alter table public.canonical_records enable row level security;
alter table public.canonical_record_sources enable row level security;
alter table public.medical_documents enable row level security;
alter table public.medical_results enable row level security;

-- user-owned tables with direct user_id
do $$
declare
  t text;
begin
  foreach t in array array[
    'source_records','measurement_groups','observations','sleep_sessions',
    'exercise_sessions','series','events','subjective_reports',
    'canonical_records','medical_documents','medical_results'
  ]
  loop
    execute format('drop policy if exists "own_%1$s" on public.%1$I', t);
    execute format(
      'create policy "own_%1$s" on public.%1$I
       for all using (auth.uid() = user_id)
       with check (auth.uid() = user_id)', t
    );
  end loop;
end $$;

-- Child tables: authorization through parent ownership.
drop policy if exists "own_sleep_stages" on public.sleep_stages;
create policy "own_sleep_stages" on public.sleep_stages
for all
using (
  exists (
    select 1 from public.sleep_sessions s
    where s.id = sleep_stages.sleep_session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.sleep_sessions s
    where s.id = sleep_stages.sleep_session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "own_series_points" on public.series_points;
create policy "own_series_points" on public.series_points
for all
using (
  exists (
    select 1 from public.series s
    where s.id = series_points.series_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.series s
    where s.id = series_points.series_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "own_canonical_record_sources" on public.canonical_record_sources;
create policy "own_canonical_record_sources" on public.canonical_record_sources
for all
using (
  exists (
    select 1 from public.canonical_records c
    where c.id = canonical_record_sources.canonical_record_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.canonical_records c
    where c.id = canonical_record_sources.canonical_record_id
      and c.user_id = auth.uid()
  )
);

-- Registry tables are readable by authenticated users.
alter table public.metric_registry enable row level security;
alter table public.source_priority_registry enable row level security;

drop policy if exists "authenticated_read_metric_registry" on public.metric_registry;
create policy "authenticated_read_metric_registry"
on public.metric_registry for select
to authenticated
using (true);

drop policy if exists "authenticated_read_source_priority" on public.source_priority_registry;
create policy "authenticated_read_source_priority"
on public.source_priority_registry for select
to authenticated
using (true);
