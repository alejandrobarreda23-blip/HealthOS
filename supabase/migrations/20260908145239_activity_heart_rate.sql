-- Current, explicit HR configuration. Historical activities are labelled as reanalysis.
create table public.subject_hr_settings (
  subject_id uuid not null references public.subjects(id) on delete cascade,
  sport text not null default 'all' check (length(sport) between 1 and 80),
  method text not null default 'max' check (method in ('max','reserve','custom')),
  max_hr smallint check (max_hr between 60 and 240),
  rest_hr smallint check (rest_hr between 25 and 120),
  date_of_birth date check (date_of_birth >= date '1900-01-01' and date_of_birth <= current_date),
  custom_edges integer[],
  updated_at timestamptz not null default now(),
  primary key(subject_id,sport),
  check (rest_hr is null or max_hr is null or rest_hr < max_hr),
  check (method <> 'reserve' or (max_hr is not null and rest_hr is not null)),
  check (method <> 'custom' or (custom_edges is not null and cardinality(custom_edges)=6 and array_lower(custom_edges,1)=1 and array_position(custom_edges,null) is null
    and custom_edges[1]>=25 and custom_edges[6]<=240
    and custom_edges[1]<custom_edges[2] and custom_edges[2]<custom_edges[3] and custom_edges[3]<custom_edges[4] and custom_edges[4]<custom_edges[5] and custom_edges[5]<custom_edges[6]))
);
alter table public.subject_hr_settings enable row level security;
revoke all on public.subject_hr_settings from anon,authenticated;
grant select,insert,update on public.subject_hr_settings to authenticated;
grant all on public.subject_hr_settings to service_role;
create policy hr_settings_read on public.subject_hr_settings for select to authenticated using(public.can_access_subject(subject_id));
create policy hr_settings_insert on public.subject_hr_settings for insert to authenticated with check(
  public.is_admin() or exists(select 1 from public.subject_access a where a.subject_id=subject_hr_settings.subject_id and a.user_id=(select auth.uid()) and a.permission in ('owner','editor'))
);
create policy hr_settings_update on public.subject_hr_settings for update to authenticated using(
  public.is_admin() or exists(select 1 from public.subject_access a where a.subject_id=subject_hr_settings.subject_id and a.user_id=(select auth.uid()) and a.permission in ('owner','editor'))
) with check(
  public.is_admin() or exists(select 1 from public.subject_access a where a.subject_id=subject_hr_settings.subject_id and a.user_id=(select auth.uid()) and a.permission in ('owner','editor'))
);

-- Cache populated only by an authenticated, authorized Edge Function. No GPS or secrets.
create table public.activity_streams (
  subject_id uuid not null references public.subjects(id) on delete cascade,
  session_id uuid not null references public.exercise_sessions(id) on delete cascade,
  source_record_id uuid not null references public.source_records(id) on delete cascade,
  provider text not null check(provider='intervals_icu'),
  streams jsonb not null check(jsonb_typeof(streams)='array' and jsonb_array_length(streams) between 2 and 4),
  fetched_at timestamptz not null default now(),
  primary key(subject_id,session_id)
);
create index activity_streams_session_idx on public.activity_streams(session_id);
create index activity_streams_source_idx on public.activity_streams(source_record_id);
alter table public.activity_streams enable row level security;
revoke all on public.activity_streams from anon,authenticated;
grant select on public.activity_streams to authenticated;
grant all on public.activity_streams to service_role;
create policy activity_streams_read on public.activity_streams for select to authenticated using(public.can_access_subject(subject_id));
