-- Health OS v1.6 — N-of-1 Experiment Designer
-- Designs prospective personal experiments from explicit hypotheses.
-- An experiment proposal is not evidence until completed and analyzed.

create type public.experiment_status as enum (
  'proposed','accepted','running','paused','completed','aborted','analyzed'
);

create type public.experiment_design_kind as enum (
  'abab','randomized_days','paired_blocks','before_after','dose_response'
);

create table if not exists public.experiment_protocols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hypothesis_id uuid references public.hypotheses(id) on delete set null,
  exposure_key text not null,
  title text not null,
  design_kind public.experiment_design_kind not null,
  status public.experiment_status not null default 'proposed',

  primary_outcome text not null,
  secondary_outcomes text[] not null default '{}',
  effect_window text not null,

  planned_exposure_days integer not null,
  planned_control_days integer not null,
  minimum_pairs integer not null,
  washout_hours integer not null default 0,

  randomization_seed text,
  schedule_plan jsonb not null default '{}'::jsonb,
  inclusion_rules jsonb not null default '{}'::jsonb,
  exclusion_rules jsonb not null default '{}'::jsonb,
  confounders_to_track text[] not null default '{}',
  stopping_rules jsonb not null default '{}'::jsonb,

  expected_direction text check(expected_direction in ('favorable','unfavorable','unknown')),
  minimum_detectable_effect double precision,
  protocol_confidence double precision not null check(protocol_confidence between 0 and 1),
  rationale jsonb not null default '{}'::jsonb,

  protocol_version text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiment_protocols(id) on delete cascade,
  assignment_date date not null,
  arm text not null check(arm in ('exposure','control','washout')),
  planned boolean not null default true,
  completed boolean,
  adherence double precision check(adherence between 0 and 1),
  notes text,
  unique(experiment_id, assignment_date)
);

create table if not exists public.experiment_results (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiment_protocols(id) on delete cascade,
  analyzed_at timestamptz not null default now(),
  primary_effect double precision,
  confidence double precision not null check(confidence between 0 and 1),
  n_pairs integer not null,
  adherence double precision not null check(adherence between 0 and 1),
  confounder_coverage double precision not null check(confounder_coverage between 0 and 1),
  result_status text not null check(result_status in ('insufficient','no_clear_signal','favorable','unfavorable','mixed')),
  secondary_results jsonb not null default '{}'::jsonb,
  sensitivity_analysis jsonb not null default '{}'::jsonb,
  interpretation text not null,
  analysis_version text not null
);

alter table public.experiment_protocols enable row level security;
alter table public.experiment_assignments enable row level security;
alter table public.experiment_results enable row level security;

create policy "own experiment protocols" on public.experiment_protocols for all
using(auth.uid()=user_id) with check(auth.uid()=user_id);

create policy "own experiment assignments" on public.experiment_assignments for all
using (
  exists(select 1 from public.experiment_protocols p
         where p.id=experiment_id and p.user_id=auth.uid())
)
with check (
  exists(select 1 from public.experiment_protocols p
         where p.id=experiment_id and p.user_id=auth.uid())
);

create policy "own experiment results" on public.experiment_results for all
using (
  exists(select 1 from public.experiment_protocols p
         where p.id=experiment_id and p.user_id=auth.uid())
)
with check (
  exists(select 1 from public.experiment_protocols p
         where p.id=experiment_id and p.user_id=auth.uid())
);
