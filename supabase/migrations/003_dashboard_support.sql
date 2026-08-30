-- Health OS v0.8 dashboard support

create or replace view public.source_freshness as
select
  user_id,
  provider,
  max(received_at) as last_received_at,
  count(*) as raw_record_count
from public.source_records
group by user_id,provider;

-- Useful deterministic feature names are intentionally strings in v0.x.
-- A dedicated feature registry can be introduced once feature semantics stabilize.

create index if not exists idx_findings_user_day_status
  on public.findings(user_id,physiological_date desc,status);

create index if not exists idx_daily_features_lookup
  on public.daily_features(user_id,physiological_date,feature_key);
