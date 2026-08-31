-- HealthOS v1.10.4 — Source continuity
-- Source continuity is an acquisition signal. It must never be interpreted as
-- a physiological change without observed physiology.

-- Fix the canonical key actually present in HealthOS production data.
update public.metric_registry set
 measurement_mode='passive_daily',continuous_required=false,manual_burden='none',
 longitudinal_roles=array['state','dynamics'],
 minimum_useful_density='{"window_days":42,"minimum_distinct_days":20,"target_distinct_days":30}'::jsonb,
 staleness_policy='{"max_age_days":3,"policy_kind":"operational_stream_freshness"}'::jsonb,
 updated_at=now()
where metric_key='resting_heart_rate';

-- Extend the existing summary with the provider of the latest observation.
-- This allows the runtime to collapse synchronized stale metrics into one
-- source-continuity signal instead of producing multiple misleading prompts.
create or replace view public.metric_observation_summary
with (security_invoker = true) as
select
  user_id,
  metric_key,
  count(*)::bigint as observation_count,
  count(distinct physiological_date)::bigint as distinct_days,
  min(started_at) as first_observed_at,
  max(started_at) as last_observed_at,
  avg(quality_score) filter (where quality_score is not null) as mean_quality_score,
  (array_agg(provider order by started_at desc, created_at desc))[1] as last_provider
from public.observations
group by user_id, metric_key;

grant select on public.metric_observation_summary to authenticated;
