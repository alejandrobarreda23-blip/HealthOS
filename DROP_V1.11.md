# HealthOS v1.11 — Runtime Intelligence Drop

## Purpose

Close the first real deterministic intelligence loop:

`normalized observations -> robust baseline -> findings -> Health Brief -> Today / Trends`

## Migrations

This offline drop has now been reconciled into the live migration chain.

Run after existing 001–018:
1. `019_daily_features_v1.sql`
2. `020_metric_dictionary_v1.sql`
3. `021_baseline_engine_v1.sql`
4. `022_finding_registry_v1.sql`
5. `023_missingness_source_continuity_v1.sql`
6. `024_health_brief_runtime_v1.sql`

Do not run the old offline migration numbers from the development package.

## Runtime invocation

`refreshAnalysisRuntimeV1(userId, asOfDate)` is the single application-level analysis refresh entry point.

It:

1. reads up to 120 days of normalized observations;
2. reads exercise sessions and manual events;
3. computes reference baselines;
4. computes recent coverage;
5. records recent missingness only as `unknown` unless evidence identifies a stronger reason;
6. detects source/device/normalizer transitions;
7. generates deterministic findings whose own sample/coverage requirements are met;
8. resolves older generated finding windows;
9. persists baselines/findings;
10. persists `health_brief_v1`.

## Implemented detectors in runtime

- insufficient recent data
- sustained HRV drop
- sustained resting-HR elevation
- recovery concordance
- sleep deficit
- SpO2 deviation
- weight trend

## Deliberately deferred detectors

- acute training-load increase
- recovery/load mismatch

They remain registered but disabled from runtime until HealthOS has a canonical, versioned training-load input. Duration/distance are not silently converted into an invented load score.

## Missingness rule

A missing observation is not evidence of why it is missing.

Therefore V1 may persist:

`reason = unknown`

but does not silently infer:

- device_not_worn
- source_not_synced
- permission_missing

Those require explicit evidence from connector/runtime state.

## UI

`Today.tsx` now consumes latest persisted `health_brief_v1` rather than composing physiological interpretation ad hoc in the component.

`Trends.tsx` now consumes provider-neutral `daily_features_v1` with explicit gaps. A missing day breaks the plotted line; no interpolation is performed.

## Live-repository integration

The reconciled live `Data.tsx` preserves the current Intervals.icu / `rapid-service` implementation and adds downstream analysis without replacing acquisition code.

Current flow:
`rapid-service sync -> refresh_daily_features_v1 RPC -> refreshAnalysisRuntimeV1 -> Today / Trends`

A downstream analysis failure is reported separately and does not relabel a successful raw/normalized sync as failed.

## Verification state

Source-level development completed. Full `npm ci` could not complete in the build container due dependency-install timeout. A subsequent TypeScript attempt was blocked by the partially installed dependency tree (missing type definition packages), so this drop must pass GitHub CI before production deployment.
