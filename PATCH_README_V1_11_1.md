# HealthOS v1.11.1 — Netlify typecheck hotfix

This patch updates two test fixtures that were left behind when the acquisition types were expanded in v1.10.5/v1.11.0.

## Why Netlify failed

Runtime code compiled far enough for TypeScript to reach the tests, but the fixtures still used the older shapes:

- `MetricAcquisitionContract` now requires `registryStatus`.
- `AcquisitionOpportunity` now requires `priorityTier`, `groupKey`, `groupLabel`, `actionability`, and `acquisitionRationale`.

No runtime logic or Supabase schema is changed.

## Files replaced

- `tests/acquisition-coverage.test.ts`
- `tests/source-continuity.test.ts`

## Supabase

No migration. Do not run any SQL.

## Validation

The patch directly addresses both TypeScript errors reported by Netlify. A full local build could not be completed in the artifact environment because its cached `node_modules` tree is incomplete; Netlify/GitHub CI remains the authoritative full build gate.
