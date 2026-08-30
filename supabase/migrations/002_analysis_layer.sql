-- Health OS v0.2
-- Deterministic feature and AI-context layer

do $$ begin
  create type finding_severity as enum ('info', 'low', 'moderate', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type finding_status as enum ('active', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_run_status as enum ('pending', 'completed', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.daily_features (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  physiological_date date not null,
  feature_key text not null,
  value_numeric double precision,
  value_text text,
  value_boolean boolean,
  unit text,

  computation_version text not null,
  source_window_start timestamptz,
  source_window_end timestamptz,
  sample_count integer,
  coverage_ratio double precision check (
    coverage_ratio is null or (coverage_ratio >= 0 and coverage_ratio <= 1)
  ),
  quality_score double precision check (
    quality_score is null or (quality_score >= 0 and quality_score <= 1)
  ),

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  unique (user_id, physiological_date, feature_key, computation_version),

  check (
    ((value_numeric is not null)::int +
     (value_text is not null)::int +
     (value_boolean is not null)::int) = 1
  )
);

create index if not exists idx_daily_features_user_day
  on public.daily_features(user_id, physiological_date desc);

create index if not exists idx_daily_features_user_key
  on public.daily_features(user_id, feature_key, physiological_date desc);

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  finding_key text not null,
  domain text not null,
  title text not null,
  summary text,

  detected_at timestamptz not null default now(),
  physiological_date date,
  period_start date,
  period_end date,

  severity finding_severity not null default 'info',
  status finding_status not null default 'active',

  confidence double precision check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),

  detector_version text not null,
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_findings_user_status
  on public.findings(user_id, status, detected_at desc);

drop trigger if exists trg_findings_updated_at on public.findings;
create trigger trg_findings_updated_at
before update on public.findings
for each row execute function public.set_updated_at();

create table if not exists public.analysis_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  context_type text not null,
  title text,
  question text,

  period_start date,
  period_end date,

  context_version text not null,
  payload jsonb not null,

  estimated_tokens integer,
  expires_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_contexts_user_created
  on public.analysis_contexts(user_id, created_at desc);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  analysis_context_id uuid references public.analysis_contexts(id) on delete set null,

  provider text not null,
  model text not null,
  task_type text not null,
  prompt_version text not null,

  status ai_run_status not null default 'pending',

  input_tokens integer,
  output_tokens integer,
  estimated_cost_eur numeric(12,6),

  output_json jsonb,
  error text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_ai_runs_user_created
  on public.ai_runs(user_id, created_at desc);

-- Optional audit trail for medically relevant derived state.
create table if not exists public.analysis_audit_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.daily_features enable row level security;
alter table public.findings enable row level security;
alter table public.analysis_contexts enable row level security;
alter table public.ai_runs enable row level security;
alter table public.analysis_audit_log enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'daily_features','findings','analysis_contexts','ai_runs','analysis_audit_log'
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
