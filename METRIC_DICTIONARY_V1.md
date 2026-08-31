# HealthOS Metric Dictionary V1

The metric dictionary is semantic infrastructure, not a UI catalogue. A metric represents a physiological variable independently of the vendor that produced it.

## Rules
- Provider and device remain provenance, never part of metric identity.
- MEASURED, DERIVED, REPORTED and INFERRED remain distinct.
- Missingness is preserved; no physiological series is silently zero-filled or interpolated.
- Source equivalence is explicit. HRV and sleep are device/provider-algorithm sensitive; weight and direct BP measurements are more directly comparable.
- Comparison direction is not universally “more is better”. Supported semantics: higher_favorable, lower_favorable, target_range, context_dependent, neutral.
- Every metric carries a baseline window, minimum sample count and minimum coverage requirement.

The executable registry lives in `src/health/metrics/dictionary.ts`. Database metadata is introduced by migration 016.
