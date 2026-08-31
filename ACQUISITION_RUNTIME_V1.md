# HealthOS Acquisition Runtime V1

## Purpose
Turn the acquisition contract into a deterministic runtime question:

> Which parts of the longitudinal record are sufficiently covered, and which gaps are worth considering next?

This layer does **not** diagnose, prescribe tests, or infer causes.

## Runtime flow

`metric_registry -> observation summaries -> recent density -> coverage status -> ACQ-06 rank -> UI opportunity`

Coverage states:
- `missing`
- `stale`
- `below_density`
- `adequate`
- `observed_no_cadence`

`observed_no_cadence` is deliberate. Sparse clinical/laboratory variables can remain useful without HealthOS inventing a universal repetition interval.

## Boundaries
1. Operational freshness is not a medical testing interval.
2. A ranked gap is not an instruction to obtain a test.
3. Missing context remains unknown.
4. Laboratory/clinical gaps are surfaced for review, not automatically ordered.
5. The ranking weights are product-policy weights, not probabilities or evidence grades.
6. Output is re-derivable from canonical observations, registry contracts and code version.

## Supabase
Migration `016_acquisition_runtime.sql` adds a security-invoker summary view and operational density/freshness metadata for existing passive metrics.
