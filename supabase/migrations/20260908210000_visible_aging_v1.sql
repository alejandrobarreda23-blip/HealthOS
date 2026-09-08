-- =========================================================
-- HealthOS — Visible Aging V1
-- Maximum information, minimum user burden.
-- Additive foundation only: no beauty score, no facial-age output.
-- =========================================================

create table if not exists public.visible_aging_photo_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_at timestamptz not null,
  protocol_version text not null,
  protocol_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'complete'
    check (status in ('complete','cancelled')),
  front_path text not null,
  oblique_path text not null,
  profile_path text not null,
  quality jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visible_aging_photo_sessions_user_date_idx
  on public.visible_aging_photo_sessions(user_id, captured_at desc);

alter table public.visible_aging_photo_sessions enable row level security;

drop policy if exists visible_aging_photo_sessions_select on public.visible_aging_photo_sessions;
create policy visible_aging_photo_sessions_select
  on public.visible_aging_photo_sessions for select to authenticated
  using (public.can_read_data_user(user_id));

drop policy if exists visible_aging_photo_sessions_insert on public.visible_aging_photo_sessions;
create policy visible_aging_photo_sessions_insert
  on public.visible_aging_photo_sessions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists visible_aging_photo_sessions_update on public.visible_aging_photo_sessions;
create policy visible_aging_photo_sessions_update
  on public.visible_aging_photo_sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists visible_aging_photo_sessions_delete on public.visible_aging_photo_sessions;
create policy visible_aging_photo_sessions_delete
  on public.visible_aging_photo_sessions for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.visible_aging_interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intervention_type text not null,
  label text not null check (char_length(trim(label)) between 1 and 160),
  started_on date not null,
  ended_on date null,
  note text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_on is null or ended_on >= started_on)
);

create index if not exists visible_aging_interventions_user_date_idx
  on public.visible_aging_interventions(user_id, started_on desc);

alter table public.visible_aging_interventions enable row level security;

drop policy if exists visible_aging_interventions_select on public.visible_aging_interventions;
create policy visible_aging_interventions_select
  on public.visible_aging_interventions for select to authenticated
  using (public.can_read_data_user(user_id));

drop policy if exists visible_aging_interventions_insert on public.visible_aging_interventions;
create policy visible_aging_interventions_insert
  on public.visible_aging_interventions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists visible_aging_interventions_update on public.visible_aging_interventions;
create policy visible_aging_interventions_update
  on public.visible_aging_interventions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists visible_aging_interventions_delete on public.visible_aging_interventions;
create policy visible_aging_interventions_delete
  on public.visible_aging_interventions for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.visible_aging_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid null references public.visible_aging_photo_sessions(id) on delete cascade,
  metric_key text not null,
  value_numeric double precision null,
  value_text text null,
  unit text null,
  data_level text not null
    check (data_level in ('measured','derived','reported','inferred')),
  method_version text not null,
  confidence double precision null
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  observed_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (value_numeric is not null or value_text is not null)
);

create index if not exists visible_aging_observations_user_metric_date_idx
  on public.visible_aging_observations(user_id, metric_key, observed_at desc);

alter table public.visible_aging_observations enable row level security;

drop policy if exists visible_aging_observations_select on public.visible_aging_observations;
create policy visible_aging_observations_select
  on public.visible_aging_observations for select to authenticated
  using (public.can_read_data_user(user_id));

-- No authenticated INSERT/UPDATE/DELETE policy is created for derived image
-- observations. A future versioned analysis service writes with service_role.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'visible-aging-private',
  'visible-aging-private',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists visible_aging_storage_select on storage.objects;
create policy visible_aging_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'visible-aging-private'
    and case
      when (storage.foldername(name))[1]
        ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
      then public.can_read_data_user(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

drop policy if exists visible_aging_storage_insert on storage.objects;
create policy visible_aging_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'visible-aging-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists visible_aging_storage_update on storage.objects;
create policy visible_aging_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'visible-aging-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'visible-aging-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists visible_aging_storage_delete on storage.objects;
create policy visible_aging_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'visible-aging-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
