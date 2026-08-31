# HealthOS v1.11.0 — Reconciled Runtime Intelligence

This patch was built from the live GitHub ZIP supplied on 2026-08-31 after V1.10.5 / migration 018 was confirmed in Supabase.

## Why this patch exists

A substantial branch of HealthOS was developed offline before the acquisition branch reached migrations 015–018. The old offline migration numbers therefore cannot be replayed. V1.11 reconciles that work by content against the live repository.

## Apply to GitHub

Copy/replace the files in this patch preserving paths.

The package version becomes `1.11.0`.

## Apply to Supabase

Preferred for the current manually-managed project:

1. Open `ops/SUPABASE_RECONCILE_019_024.sql`.
2. Copy the entire file into Supabase SQL Editor.
3. Run it once.

It is transactional and fails closed unless the V1.10.5 baseline (including migration 018 structures) is present.

Canonical migration files committed to the repository are:

- 019_daily_features_v1.sql
- 020_metric_dictionary_v1.sql
- 021_baseline_engine_v1.sql
- 022_finding_registry_v1.sql
- 023_missingness_source_continuity_v1.sql
- 024_health_brief_runtime_v1.sql

Do not run the old offline migrations numbered 015–020 from the development packages.

## What becomes live

`observations -> daily features -> robust baselines -> deterministic findings -> health_brief_v1 -> Today / Trends`

After a successful `rapid-service` sync, Data now:
1. preserves raw-first sync;
2. refreshes `daily_features_v1`;
3. runs `refreshAnalysisRuntimeV1`;
4. reports analysis failure separately from acquisition failure.

Today reads the latest persisted `health_brief_v1`.
Trends reads real provider-neutral daily features and preserves visible gaps.

## Important epistemic reconciliation

- Missing data remains missing.
- Unknown `quality_score` remains NULL; it is not converted to 1.0.
- Source/device transitions are metrology events, not physiological events.
- The V1.10.4 acquisition-level stale-source grouping remains authoritative for “no recent wearable data”.
- Training load is not invented from duration/distance.
- Findings are deviations, not diagnoses or causal conclusions.

## Other offline work now in the repository

Integrated as code + tests + specifications, but deliberately not live-wired/persisted yet:

- Analysis Orchestrator V1
- Retrospective Validation Harness V1
- System Maturity / Evidence Ledger
- Export / Survivability V1.2

This is intentional. Empty persistence tables would create a false appearance that orchestration, validation or survivability are already operational. See `RECONCILIATION_V1.11.md`.

## Verification performed in the build workspace

- Pure deterministic/core V1.11 modules type-checked successfully under TypeScript strict with no external type packages.
- All TS/TSX source files passed TypeScript syntax transpilation.
- Full `npm test` / `npm run build` could not be completed in this workspace because `npm ci` timed out and left the dependency tree incomplete. GitHub CI remains the authoritative full-suite/build gate.

## Live validation after Supabase

After the SQL succeeds:
1. open HealthOS;
2. go to Data;
3. click `Sincronizar Intervals.icu`;
4. confirm “Análisis longitudinal — Actualizado”;
5. open Today and Trends.

Given the known real history where the watch was not worn after 17 Aug 2026, the correct behavior is low/recent-data uncertainty, not a physiological deterioration claim.
