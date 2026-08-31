-- HealthOS v1.10.3 — Acquisition runtime support
-- Deterministic coverage inputs. Operational cadence metadata is not clinical guidance.

create or replace view public.metric_observation_summary
with (security_invoker = true) as
select
  user_id,
  metric_key,
  count(*)::bigint as observation_count,
  count(distinct physiological_date)::bigint as distinct_days,
  min(started_at) as first_observed_at,
  max(started_at) as last_observed_at,
  avg(quality_score) filter (where quality_score is not null) as mean_quality_score
from public.observations
group by user_id, metric_key;

grant select on public.metric_observation_summary to authenticated;

-- Passive metrics already present in the canonical registry. The density and
-- freshness policies below are HealthOS operational policies for whether the
-- longitudinal stream is sufficiently populated; they are NOT medical testing
-- intervals or claims of physiological necessity.
update public.metric_registry set
 measurement_mode='passive_daily',continuous_required=false,manual_burden='none',
 longitudinal_roles=array['dynamics'],
 minimum_useful_density='{"window_days":42,"minimum_distinct_days":20,"target_distinct_days":30}'::jsonb,
 staleness_policy='{"max_age_days":3,"policy_kind":"operational_stream_freshness"}'::jsonb,
 updated_at=now()
where metric_key='hrv_rmssd';

update public.metric_registry set
 measurement_mode='passive_daily',continuous_required=false,manual_burden='none',
 longitudinal_roles=array['state','dynamics'],
 minimum_useful_density='{"window_days":42,"minimum_distinct_days":20,"target_distinct_days":30}'::jsonb,
 staleness_policy='{"max_age_days":3,"policy_kind":"operational_stream_freshness"}'::jsonb,
 updated_at=now()
where metric_key='resting_hr';

update public.metric_registry set
 measurement_mode='passive_daily',continuous_required=false,manual_burden='none',
 longitudinal_roles=array['state','dynamics'],
 minimum_useful_density='{"window_days":42,"minimum_distinct_days":20,"target_distinct_days":30}'::jsonb,
 staleness_policy='{"max_age_days":3,"policy_kind":"operational_stream_freshness"}'::jsonb,
 updated_at=now()
where metric_key='sleep_duration';

update public.metric_registry set
 measurement_mode='passive_daily',continuous_required=false,manual_burden='none',
 longitudinal_roles=array['context'],
 minimum_useful_density='{"window_days":30,"minimum_distinct_days":14,"target_distinct_days":24}'::jsonb,
 staleness_policy='{"max_age_days":3,"policy_kind":"operational_stream_freshness"}'::jsonb,
 updated_at=now()
where metric_key='steps';

update public.metric_registry set
 measurement_mode='home_periodic',continuous_required=false,manual_burden='very_low',
 longitudinal_roles=array['state','trajectory'],
 minimum_useful_density='{"window_days":42,"minimum_distinct_days":4,"target_distinct_days":8}'::jsonb,
 staleness_policy='{"max_age_days":21,"policy_kind":"operational_trajectory_freshness"}'::jsonb,
 updated_at=now()
where metric_key='weight';

update public.metric_registry set
 measurement_mode='passive_daily',continuous_required=false,manual_burden='none',
 longitudinal_roles=array['state','dynamics'],
 minimum_useful_density='{"window_days":42,"minimum_distinct_days":10,"target_distinct_days":20}'::jsonb,
 staleness_policy='{"max_age_days":7,"policy_kind":"operational_stream_freshness"}'::jsonb,
 updated_at=now()
where metric_key='oxygen_saturation';
