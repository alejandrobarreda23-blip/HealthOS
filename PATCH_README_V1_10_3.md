# HealthOS v1.10.3 — Acquisition Runtime

## What this patch does
- Converts Acquisition Principles / Metric Contract semantics into runtime code.
- Reads acquisition semantics from `metric_registry`.
- Reads all-time observation summaries through a security-invoker view.
- Computes recent distinct-day density from canonical `observations`.
- Produces deterministic coverage states and ACQ-06 priorities.
- Surfaces up to five acquisition gaps in the Data screen.
- Keeps laboratory/clinical cadence intentionally undefined unless the contract defines it.

## Supabase
After GitHub deployment, run exactly once:

`supabase/migrations/016_acquisition_runtime.sql`

The migration is forward-only and safe to re-run at the SQL-object level, but migration files should still be treated as immutable history.

## Verification SQL
```sql
select metric_key, measurement_mode, minimum_useful_density, staleness_policy
from public.metric_registry
where metric_key in ('hrv_rmssd','resting_hr','sleep_duration','steps','weight','oxygen_saturation')
order by metric_key;
```

```sql
select *
from public.metric_observation_summary
where user_id = auth.uid()
order by last_observed_at desc nulls last;
```

## Important boundary
The output is an acquisition priority, not a medical recommendation. A missing HbA1c or blood-pressure campaign may be surfaced as a gap, but HealthOS does not autonomously order or prescribe it.
