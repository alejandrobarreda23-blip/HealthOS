-- HealthOS v1.11.0 — Baseline persistence V1 (reconciled)
create table if not exists public.metric_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_key text not null references public.metric_registry(metric_key),
  as_of_date date not null,
  baseline_kind text not null check (baseline_kind in ('all_contexts','reference','contextual')),
  context_key text,
  window_days integer not null,
  sample_count integer not null,
  expected_days integer not null,
  coverage_ratio double precision not null check (coverage_ratio between 0 and 1),
  median_value double precision,
  mad_value double precision,
  p10 double precision,
  p25 double precision,
  p50 double precision,
  p75 double precision,
  p90 double precision,
  evidence_strength text not null check (evidence_strength in ('INSUFFICIENT','LOW','MODERATE','HIGH')),
  sufficient boolean not null,
  excluded_sample_count integer not null default 0,
  exclusion_reasons jsonb not null default '{}'::jsonb,
  algorithm_version text not null default 'baseline_v1',
  created_at timestamptz not null default now(),
  unique(user_id,metric_key,as_of_date,baseline_kind,context_key,algorithm_version)
);
create index if not exists idx_metric_baselines_user_metric_date on public.metric_baselines(user_id,metric_key,as_of_date desc);
alter table public.metric_baselines enable row level security;
drop policy if exists "own_metric_baselines" on public.metric_baselines;
create policy "own_metric_baselines" on public.metric_baselines for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
