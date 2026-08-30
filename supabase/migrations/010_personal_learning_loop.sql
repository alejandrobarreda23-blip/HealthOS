-- Health OS v1.5 — Personal Learning Loop
-- Connects event associations / N-of-1 evidence to physiological systems and Aging.
-- Personal associations NEVER overwrite measured observations or scientific evidence.

create type public.personal_evidence_level as enum (
 'insufficient','exploratory','moderate','strong','experiment_supported'
);

create table if not exists public.outcome_system_map (
 outcome_key text not null,
 system_key text not null references public.aging_system_registry(system_key),
 direction text not null check(direction in ('higher_favorable','lower_favorable','range','contextual')),
 base_relevance double precision not null check(base_relevance between 0 and 1),
 map_version text not null,
 primary key(outcome_key,system_key)
);

create table if not exists public.personal_effects (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 exposure_key text not null,
 outcome_key text not null,
 system_key text not null references public.aging_system_registry(system_key),
 association_id uuid references public.associations(id) on delete set null,
 evidence_level public.personal_evidence_level not null,
 standardized_effect double precision,
 favorable_effect double precision,
 confidence double precision not null check(confidence between 0 and 1),
 n_exposed integer not null default 0,
 n_control integer not null default 0,
 confounder_coverage double precision not null default 0 check(confounder_coverage between 0 and 1),
 replication_count integer not null default 0,
 effect_window text not null,
 evidence jsonb not null default '{}'::jsonb,
 engine_version text not null,
 created_at timestamptz not null default now()
);

create table if not exists public.behavior_system_impacts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 exposure_key text not null,
 system_key text not null references public.aging_system_registry(system_key),
 favorable_impact double precision,
 confidence double precision not null check(confidence between 0 and 1),
 evidence_level public.personal_evidence_level not null,
 outcome_count integer not null,
 supporting_effect_ids uuid[] not null default '{}',
 explanation jsonb not null default '{}'::jsonb,
 engine_version text not null,
 calculated_at timestamptz not null default now(),
 unique(user_id,exposure_key,system_key,engine_version)
);

create table if not exists public.personal_opportunities (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 opportunity_key text not null,
 exposure_key text not null,
 action text not null,
 system_keys text[] not null default '{}',
 expected_direction text not null check(expected_direction in ('increase','reduce','maintain','test')),
 opportunity_score double precision not null check(opportunity_score between 0 and 1),
 confidence double precision not null check(confidence between 0 and 1),
 evidence_level public.personal_evidence_level not null,
 rationale jsonb not null default '{}'::jsonb,
 status text not null default 'candidate',
 engine_version text not null,
 created_at timestamptz not null default now(),
 unique(user_id,opportunity_key,engine_version)
);

alter table public.personal_effects enable row level security;
alter table public.behavior_system_impacts enable row level security;
alter table public.personal_opportunities enable row level security;
create policy "own personal effects" on public.personal_effects for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "own behavior impacts" on public.behavior_system_impacts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "own personal opportunities" on public.personal_opportunities for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

insert into public.outcome_system_map(outcome_key,system_key,direction,base_relevance,map_version) values
('hrv_rmssd','sleep_recovery','higher_favorable',0.85,'outcome-map-v1'),
('hrv_rmssd','cardiovascular','higher_favorable',0.45,'outcome-map-v1'),
('resting_hr','cardiovascular','lower_favorable',0.80,'outcome-map-v1'),
('resting_hr','sleep_recovery','lower_favorable',0.45,'outcome-map-v1'),
('sleep_duration','sleep_recovery','range',0.70,'outcome-map-v1'),
('sleep_efficiency','sleep_recovery','higher_favorable',0.80,'outcome-map-v1'),
('sleep_latency','sleep_recovery','lower_favorable',0.55,'outcome-map-v1'),
('subjective_energy','sleep_recovery','higher_favorable',0.35,'outcome-map-v1'),
('glucose','metabolic','contextual',0.75,'outcome-map-v1'),
('glucose_fasting','metabolic','lower_favorable',0.80,'outcome-map-v1'),
('systolic_bp','cardiovascular','lower_favorable',0.90,'outcome-map-v1'),
('vo2max','fitness','higher_favorable',0.95,'outcome-map-v1'),
('weight','body_composition','contextual',0.35,'outcome-map-v1'),
('crp','inflammation','lower_favorable',0.80,'outcome-map-v1')
on conflict(outcome_key,system_key) do update set
 direction=excluded.direction,base_relevance=excluded.base_relevance,map_version=excluded.map_version;
