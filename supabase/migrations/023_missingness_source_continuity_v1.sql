-- HealthOS v1.11.0 — Missingness and source transition persistence (reconciled)
create table if not exists public.missingness_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  physiological_date date not null,
  metric_key text references public.metric_registry(metric_key),
  reason text not null check (reason in ('device_not_worn','source_not_synced','metric_not_supported','permission_missing','bad_data','unknown')),
  source_provider text,
  evidence jsonb not null default '{}'::jsonb,
  annotation_level health_data_level not null default 'inferred',
  algorithm_version text not null default 'missingness_v1',
  created_at timestamptz not null default now(),
  unique(user_id,physiological_date,metric_key,source_provider,algorithm_version)
);
create table if not exists public.source_continuity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text references public.metric_registry(metric_key),
  effective_date date not null,
  previous_source text,
  new_source text not null,
  event_type text not null check (event_type in ('device_change','provider_change','algorithm_change','firmware_change','unknown_transition')),
  comparability text not null check (comparability in ('likely_comparable','transition_sensitive','requires_calibration','unknown')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_missingness_user_date on public.missingness_annotations(user_id,physiological_date desc);
create index if not exists idx_source_continuity_user_metric_date on public.source_continuity_events(user_id,metric_key,effective_date desc);
alter table public.missingness_annotations enable row level security;
alter table public.source_continuity_events enable row level security;
drop policy if exists "own_missingness_annotations" on public.missingness_annotations;
create policy "own_missingness_annotations" on public.missingness_annotations for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "own_source_continuity_events" on public.source_continuity_events;
create policy "own_source_continuity_events" on public.source_continuity_events for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
