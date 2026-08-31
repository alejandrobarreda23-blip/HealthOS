-- HealthOS v1.11.0 — Persisted Health Brief + generated-finding identity.

create table if not exists public.health_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  physiological_date date not null,
  brief_version text not null,
  payload jsonb not null,
  overall_coverage double precision check (overall_coverage between 0 and 1),
  evidence_strength text check (evidence_strength is null or evidence_strength in ('INSUFFICIENT','LOW','MODERATE','HIGH')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, physiological_date, brief_version)
);

create index if not exists idx_health_briefs_user_date
  on public.health_briefs(user_id, physiological_date desc);

drop trigger if exists trg_health_briefs_updated_at on public.health_briefs;
create trigger trg_health_briefs_updated_at
before update on public.health_briefs
for each row execute function public.set_updated_at();

alter table public.health_briefs enable row level security;
drop policy if exists "own_health_briefs" on public.health_briefs;
create policy "own_health_briefs" on public.health_briefs
for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- A deterministic detector can be rerun without duplicating the same finding window.
create unique index if not exists uq_findings_generated_identity
  on public.findings(user_id, finding_key, period_end, detector_version);

-- Idempotent source-transition persistence.
create unique index if not exists uq_source_continuity_identity
  on public.source_continuity_events(user_id, metric_key, effective_date, previous_source, new_source, event_type);
