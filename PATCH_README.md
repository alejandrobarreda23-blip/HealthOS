# HealthOS v1.10.2 — patch instructions

This patch integrates the two latest architecture decisions without prematurely implementing a Systemic Health score or a full response/recovery engine.

## Add
- `ACQUISITION_PRINCIPLES_V1.md`
- `SYSTEMIC_PHYSIOLOGY_DYNAMIC_HEALTH_RESEARCH_V1.md`
- `METRIC_CONTRACT_V1.md`
- `src/acquisition/types.ts`
- `src/acquisition/policy.ts`
- `tests/acquisition-policy.test.ts`
- `supabase/migrations/015_acquisition_contract.sql`

## Delete from current GitHub ZIP
`supabase/migrations/supabase/migrations/015_daily_features_v1.sql`

That file is not SQL: it contains CSS (`.realChart`, `.trendStats`, etc.) and is nested under a duplicated `supabase/migrations` directory. `daily_features` already exists correctly in migration 002, so this file must not be run.

## Supabase — important
Before applying migration 015, inspect the remote migration history. The ZIP proves only the repository state, not what has already run remotely.

- If remote head is 014: apply `015_acquisition_contract.sql`.
- If remote already has a migration numbered/versioned 015: do **not** replay or overwrite it; rename this forward migration to the next free version (e.g. 016) and apply that.
- Never execute the corrupt nested `015_daily_features_v1.sql`.

## What this migration changes
- adds acquisition semantics to `metric_registry`;
- adds a read-only `measurement_protocol_registry`;
- registers a versioned home BP campaign;
- adds canonical BP and HbA1c metric contracts;
- enriches known HRV keys if present.

## Deliberately NOT implemented yet
- systemic-health score;
- allostatic-load score from wearable proxies;
- response/recovery/adaptation database tables;
- Dynamic Aging score;
- automated clinical cadence recommendations;
- daily manual questionnaire.

Those remain research layers until real longitudinal data and validation justify them.
