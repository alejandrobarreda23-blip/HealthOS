-- =========================================================
-- HealthOS v1.16.2 — Admin-managed subject integrations V1
-- =========================================================
-- Goals:
-- 1) passive sources belong to a subject
-- 2) only admins configure credentials
-- 3) credentials live encrypted in Supabase Vault
-- 4) normal users never receive decrypted credentials
-- 5) every configure/sync/disable action is auditable

create extension if not exists supabase_vault with schema vault;

create table if not exists public.subject_integrations (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  provider text not null,
  status text not null default 'active'
    check (status in ('active','disabled','error')),
  credential_secret_id uuid null,
  external_account_id text null,
  history_oldest date null,
  configured_by_user_id uuid null references auth.users(id) on delete set null,
  configured_at timestamptz not null default now(),
  last_sync_at timestamptz null,
  last_sync_status text null
    check (last_sync_status is null or last_sync_status in ('ok','failed')),
  last_sync_error text null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(subject_id, provider)
);

create index if not exists subject_integrations_subject_idx
  on public.subject_integrations(subject_id);

alter table public.subject_integrations enable row level security;

drop policy if exists subject_integrations_select on public.subject_integrations;
create policy subject_integrations_select
on public.subject_integrations
for select
to authenticated
using (public.can_access_subject(subject_id));

-- Browser clients never insert/update/delete integration rows directly.
-- Writes go only through SECURITY DEFINER admin RPCs.
drop policy if exists subject_integrations_insert on public.subject_integrations;
drop policy if exists subject_integrations_update on public.subject_integrations;
drop policy if exists subject_integrations_delete on public.subject_integrations;

-- Expand audit actions created in MULTIUSER V1.2.
alter table public.admin_access_log
  drop constraint if exists admin_access_log_action_check;

alter table public.admin_access_log
  add constraint admin_access_log_action_check
  check (
    action in (
      'open_subject',
      'view_dashboard',
      'compare_subject',
      'export_subject',
      'configure_source',
      'sync_source',
      'disable_source'
    )
  );

create or replace function public.list_subject_integrations(
  target_subject_id uuid
)
returns table (
  integration_id uuid,
  subject_id uuid,
  provider text,
  status text,
  external_account_id text,
  history_oldest date,
  configured_at timestamptz,
  configured_by_user_id uuid,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_access_subject(target_subject_id) then
    raise exception 'SUBJECT_ACCESS_DENIED';
  end if;

  return query
  select
    i.id,
    i.subject_id,
    i.provider,
    i.status,
    i.external_account_id,
    i.history_oldest,
    i.configured_at,
    i.configured_by_user_id,
    i.last_sync_at,
    i.last_sync_status,
    i.last_sync_error,
    i.metadata
  from public.subject_integrations i
  where i.subject_id = target_subject_id
  order by i.provider;
end;
$$;

revoke all on function public.list_subject_integrations(uuid) from public;
grant execute on function public.list_subject_integrations(uuid) to authenticated;

create or replace function public.admin_upsert_intervals_integration(
  target_subject_id uuid,
  athlete_id text,
  api_key text,
  oldest date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_admin uuid := auth.uid();
  v_secret_id uuid;
  v_existing_secret uuid;
  v_integration_id uuid;
  v_secret_name text;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if not public.can_access_subject(target_subject_id) then
    raise exception 'SUBJECT_ACCESS_DENIED';
  end if;

  if coalesce(trim(athlete_id),'') = '' then
    raise exception 'INTERVALS_ATHLETE_ID_REQUIRED';
  end if;

  if coalesce(trim(api_key),'') = '' then
    raise exception 'INTERVALS_API_KEY_REQUIRED';
  end if;

  select credential_secret_id
    into v_existing_secret
  from public.subject_integrations
  where subject_id = target_subject_id
    and provider = 'intervals_icu';

  v_secret_name :=
    'healthos_intervals_' || replace(target_subject_id::text, '-', '');

  if v_existing_secret is null then
    select vault.create_secret(
      api_key,
      v_secret_name,
      'HealthOS Intervals.icu credential for subject ' || target_subject_id::text
    ) into v_secret_id;
  else
    perform vault.update_secret(
      v_existing_secret,
      api_key,
      v_secret_name,
      'HealthOS Intervals.icu credential for subject ' || target_subject_id::text
    );
    v_secret_id := v_existing_secret;
  end if;

  insert into public.subject_integrations (
    subject_id,
    provider,
    status,
    credential_secret_id,
    external_account_id,
    history_oldest,
    configured_by_user_id,
    configured_at,
    last_sync_error,
    metadata,
    updated_at
  )
  values (
    target_subject_id,
    'intervals_icu',
    'active',
    v_secret_id,
    trim(athlete_id),
    oldest,
    v_admin,
    now(),
    null,
    jsonb_build_object(
      'credential_storage','supabase_vault',
      'configured_by','admin',
      'api_version','intervals_api_v1'
    ),
    now()
  )
  on conflict (subject_id, provider)
  do update set
    status = 'active',
    credential_secret_id = excluded.credential_secret_id,
    external_account_id = excluded.external_account_id,
    history_oldest = excluded.history_oldest,
    configured_by_user_id = excluded.configured_by_user_id,
    configured_at = excluded.configured_at,
    last_sync_error = null,
    metadata = public.subject_integrations.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_integration_id;

  insert into public.admin_access_log(
    admin_user_id, subject_id, action
  ) values (
    v_admin, target_subject_id, 'configure_source'
  );

  return v_integration_id;
end;
$$;

revoke all on function public.admin_upsert_intervals_integration(uuid,text,text,date) from public;
grant execute on function public.admin_upsert_intervals_integration(uuid,text,text,date) to authenticated;

create or replace function public.admin_disable_subject_integration(
  target_subject_id uuid,
  target_provider text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if not public.can_access_subject(target_subject_id) then
    raise exception 'SUBJECT_ACCESS_DENIED';
  end if;

  update public.subject_integrations
  set status = 'disabled',
      updated_at = now()
  where subject_id = target_subject_id
    and provider = target_provider;

  insert into public.admin_access_log(
    admin_user_id, subject_id, action
  ) values (
    v_admin, target_subject_id, 'disable_source'
  );
end;
$$;

revoke all on function public.admin_disable_subject_integration(uuid,text) from public;
grant execute on function public.admin_disable_subject_integration(uuid,text) to authenticated;

-- Service-side helper. This deliberately does NOT expose the decrypted secret.
create or replace function public.admin_mark_subject_integration_sync(
  target_subject_id uuid,
  target_provider text,
  sync_ok boolean,
  sync_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if not public.can_access_subject(target_subject_id) then
    raise exception 'SUBJECT_ACCESS_DENIED';
  end if;

  update public.subject_integrations
  set
    last_sync_at = now(),
    last_sync_status = case when sync_ok then 'ok' else 'failed' end,
    last_sync_error = case when sync_ok then null else sync_error end,
    status = case when sync_ok then 'active' else 'error' end,
    updated_at = now()
  where subject_id = target_subject_id
    and provider = target_provider;

  insert into public.admin_access_log(
    admin_user_id, subject_id, action
  ) values (
    v_admin, target_subject_id, 'sync_source'
  );
end;
$$;

revoke all on function public.admin_mark_subject_integration_sync(uuid,text,boolean,text) from public;
grant execute on function public.admin_mark_subject_integration_sync(uuid,text,boolean,text) to authenticated;
