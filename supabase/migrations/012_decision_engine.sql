-- Health OS v1.7 — Decision Engine
-- Prioritizes what deserves attention. It does not diagnose or prescribe treatment.

create type public.decision_kind as enum (
 'measure','maintain','behavior','experiment','medical_followup','data_quality'
);
create type public.decision_urgency as enum ('routine','soon','review');

create table if not exists public.decision_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 run_date date not null,
 engine_version text not null,
 input_fingerprint text not null,
 context jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(user_id,run_date,engine_version,input_fingerprint)
);

create table if not exists public.decision_items (
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null references public.decision_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 rank integer not null,
 kind public.decision_kind not null,
 urgency public.decision_urgency not null,
 title text not null,
 action text not null,
 score double precision not null check(score between 0 and 1),
 expected_benefit double precision not null check(expected_benefit between 0 and 1),
 information_gain double precision not null check(information_gain between 0 and 1),
 evidence_confidence double precision not null check(evidence_confidence between 0 and 1),
 actionability double precision not null check(actionability between 0 and 1),
 burden double precision not null check(burden between 0 and 1),
 uncertainty double precision not null check(uncertainty between 0 and 1),
 systems text[] not null default '{}',
 source_refs jsonb not null default '[]'::jsonb,
 rationale jsonb not null default '{}'::jsonb,
 status text not null default 'open',
 created_at timestamptz not null default now()
);

alter table public.decision_runs enable row level security;
alter table public.decision_items enable row level security;
create policy "own decision runs" on public.decision_runs for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "own decision items" on public.decision_items for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

create index if not exists idx_decision_items_user_status_score
 on public.decision_items(user_id,status,score desc);
