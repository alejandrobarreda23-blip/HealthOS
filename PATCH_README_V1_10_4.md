# HealthOS v1.10.4 — Source Continuity

This patch assumes v1.10.3 is already applied.

## What changes
1. Corrects the canonical RHR acquisition key from the non-existent `resting_hr` to `resting_heart_rate`.
2. Extends `metric_observation_summary` with `last_provider`.
3. Adds deterministic source-continuity detection.
4. Collapses 3+ synchronized stale passive metrics from the same provider into one source signal.
5. Keeps independent gaps (weight, BP, HbA1c, etc.) separate.
6. UI explicitly says that absent wearable data may reflect non-use or sync/connectivity and is not physiology.

## Supabase
Run exactly once (idempotent in practice):
`supabase/migrations/017_source_continuity.sql`

Verification:
```sql
select metric_key, measurement_mode, minimum_useful_density, staleness_policy
from public.metric_registry
where metric_key='resting_heart_rate';

select metric_key,last_observed_at,last_provider
from public.metric_observation_summary
order by last_observed_at desc nulls last;
```

## Product behavior expected with current known history
If HRV, RHR, sleep, SpO2 and steps all stop around 2026-08-17 from the same provider, HealthOS should render one neutral source-continuity card rather than five prompts to measure again.

It must not claim sync failure: the device may simply not have been worn.
