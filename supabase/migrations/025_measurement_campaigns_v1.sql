-- HealthOS v1.12.0 — Measurement Campaigns V1
-- User-owned, versioned measurement campaigns. Campaign measurements continue to
-- live in canonical measurement_groups + observations; no parallel physiology silo.

create table if not exists public.measurement_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  protocol_id text not null references public.measurement_protocol_registry(protocol_id),
  protocol_version text not null,
  protocol_snapshot jsonb not null,
  boundaries_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('planned','active','completed','cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  completion_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='completed' and completed_at is not null) or status<>'completed'),
  check ((status='cancelled' and cancelled_at is not null) or status<>'cancelled')
);

create index if not exists idx_measurement_campaigns_user_status
  on public.measurement_campaigns(user_id,status,started_at desc);

create unique index if not exists uq_measurement_campaigns_one_active_protocol
  on public.measurement_campaigns(user_id,protocol_id)
  where status in ('planned','active');

drop trigger if exists trg_measurement_campaigns_updated_at on public.measurement_campaigns;
create trigger trg_measurement_campaigns_updated_at
before update on public.measurement_campaigns
for each row execute function public.set_updated_at();

alter table public.measurement_groups
  add column if not exists campaign_id uuid references public.measurement_campaigns(id) on delete set null,
  add column if not exists protocol_day integer check (protocol_day is null or protocol_day >= 1),
  add column if not exists protocol_occasion text,
  add column if not exists reading_index integer check (reading_index is null or reading_index >= 1);

create index if not exists idx_measurement_groups_campaign
  on public.measurement_groups(campaign_id, measured_at);

create unique index if not exists uq_measurement_groups_campaign_slot
  on public.measurement_groups(campaign_id, protocol_day, protocol_occasion, reading_index)
  where campaign_id is not null;

alter table public.measurement_campaigns enable row level security;

-- Multiuser-compatible read policy: owners can read their campaigns and admins can
-- inspect them while the application remains read-only for non-self subjects.
drop policy if exists measurement_campaigns_select on public.measurement_campaigns;
create policy measurement_campaigns_select
on public.measurement_campaigns
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

-- Writes remain strictly owner-only. Admin subject views never gain write access.
drop policy if exists measurement_campaigns_insert on public.measurement_campaigns;
create policy measurement_campaigns_insert
on public.measurement_campaigns
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists measurement_campaigns_update on public.measurement_campaigns;
create policy measurement_campaigns_update
on public.measurement_campaigns
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists measurement_campaigns_delete on public.measurement_campaigns;
create policy measurement_campaigns_delete
on public.measurement_campaigns
for delete
to authenticated
using (auth.uid() = user_id);

-- Remove the older all-in-one policy if this migration is reapplied in a development DB.
drop policy if exists "own_measurement_campaigns" on public.measurement_campaigns;

comment on table public.measurement_campaigns is
'Versioned measurement-plan instances. Completion means protocol dataset completion, not clinical interpretation.';
comment on column public.measurement_campaigns.protocol_snapshot is
'Immutable-at-creation protocol configuration used to interpret campaign completeness reproducibly.';
