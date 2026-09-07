-- HealthOS v1.16.2 — admin refresh helper for selected subject.
-- Keeps the canonical daily_features_v1 algorithm; changes only authorized scope.

create or replace function public.refresh_daily_features_for_subject_v1(
  target_subject_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_direct integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if not public.can_access_subject(target_subject_id) then
    raise exception 'SUBJECT_ACCESS_DENIED';
  end if;

  select created_by_user_id
    into v_user_id
  from public.subjects
  where id = target_subject_id
    and status = 'active';

  if v_user_id is null then
    raise exception 'SUBJECT_DATA_OWNER_NOT_FOUND';
  end if;

  delete from public.daily_features
  where user_id = v_user_id
    and computation_version = 'daily_features_v1';

  insert into public.daily_features(
    user_id, physiological_date, feature_key, value_numeric, unit,
    computation_version, source_window_start, source_window_end,
    sample_count, coverage_ratio, quality_score, metadata
  )
  select
    o.user_id,
    o.physiological_date,
    case o.metric_key
      when 'hrv_rmssd' then 'hrv_daily'
      when 'resting_heart_rate' then 'resting_hr_daily'
      when 'sleep_duration' then 'sleep_duration_minutes'
      when 'oxygen_saturation' then 'spo2_daily'
      when 'steps' then 'steps'
    end,
    avg(o.value_numeric),
    case o.metric_key
      when 'hrv_rmssd' then 'ms'
      when 'resting_heart_rate' then 'bpm'
      when 'sleep_duration' then 'min'
      when 'oxygen_saturation' then '%'
      when 'steps' then 'count'
    end,
    'daily_features_v1',
    min(o.started_at),
    max(coalesce(o.ended_at,o.started_at)),
    count(*)::int,
    1.0,
    avg(o.quality_score),
    jsonb_build_object(
      'source','observations',
      'provider_neutral',true,
      'admin_subject_refresh',true
    )
  from public.observations o
  where o.user_id = v_user_id
    and o.metric_key in(
      'hrv_rmssd',
      'resting_heart_rate',
      'sleep_duration',
      'oxygen_saturation',
      'steps'
    )
  group by o.user_id,o.physiological_date,o.metric_key;

  get diagnostics v_direct = row_count;

  insert into public.daily_features(
    user_id,physiological_date,feature_key,value_numeric,unit,
    computation_version,sample_count,coverage_ratio,quality_score,metadata
  )
  select
    user_id,physiological_date,feature_key,value_numeric,unit,
    'daily_features_v1',sample_count,1.0,null,
    jsonb_build_object(
      'source','exercise_sessions',
      'provider_neutral',true,
      'admin_subject_refresh',true
    )
  from(
    select user_id,physiological_date,'exercise_count' feature_key,
      count(*)::float8 value_numeric,'count' unit,count(*)::int sample_count
    from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
    union all
    select user_id,physiological_date,'training_duration_minutes',
      sum(extract(epoch from(ended_at-started_at))/60.0),'min',count(*)::int
    from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
    union all
    select user_id,physiological_date,'training_distance_km',
      sum(coalesce(distance_m,0))/1000.0,'km',count(*)::int
    from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
    union all
    select user_id,physiological_date,'training_elevation_gain_m',
      sum(coalesce(elevation_gain_m,0)),'m',count(*)::int
    from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
    union all
    select user_id,physiological_date,'training_energy_kcal',
      sum(coalesce(active_energy_kcal,0)),'kcal',count(*)::int
    from public.exercise_sessions where user_id=v_user_id group by user_id,physiological_date
  ) x;

  insert into public.daily_features(
    user_id,physiological_date,feature_key,value_numeric,unit,
    computation_version,sample_count,coverage_ratio,quality_score,metadata
  )
  select
    v_user_id,
    d.physiological_date,
    'data_quality',
    count(*) filter(
      where f.feature_key in(
        'hrv_daily','resting_hr_daily','sleep_duration_minutes','spo2_daily','steps'
      )
    )::float8/5.0,
    'ratio',
    'daily_features_v1',
    count(*) filter(
      where f.feature_key in(
        'hrv_daily','resting_hr_daily','sleep_duration_minutes','spo2_daily','steps'
      )
    )::int,
    count(*) filter(
      where f.feature_key in(
        'hrv_daily','resting_hr_daily','sleep_duration_minutes','spo2_daily','steps'
      )
    )::float8/5.0,
    count(*) filter(
      where f.feature_key in(
        'hrv_daily','resting_hr_daily','sleep_duration_minutes','spo2_daily','steps'
      )
    )::float8/5.0,
    jsonb_build_object(
      'expected_metrics',5,
      'missing_is_not_imputed',true,
      'admin_subject_refresh',true
    )
  from(
    select distinct physiological_date
    from public.daily_features
    where user_id=v_user_id
      and computation_version='daily_features_v1'
  ) d
  join public.daily_features f
    on f.user_id=v_user_id
   and f.physiological_date=d.physiological_date
   and f.computation_version='daily_features_v1'
  group by d.physiological_date;

  return jsonb_build_object(
    'ok',true,
    'subject_id',target_subject_id,
    'data_user_id',v_user_id,
    'computation_version','daily_features_v1',
    'direct_features_inserted',v_direct
  );
end;
$$;

revoke all on function public.refresh_daily_features_for_subject_v1(uuid) from public;
grant execute on function public.refresh_daily_features_for_subject_v1(uuid) to authenticated;
