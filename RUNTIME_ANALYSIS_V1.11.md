# HealthOS Runtime Analysis V1.11

This drop closes the deterministic chain between normalized physiological data and an AI-ready Health Brief.

## Runtime path

`observations + exercise_sessions + events -> baseline_v1 -> findings_v1 -> health_brief_v1`

The runtime remains provider-neutral after normalization. Raw provider payloads remain in `source_records` and are never replaced by inferred values.

## Safety / epistemic rules

- Missing days remain missing. Absence alone is labelled `unknown`; it is never silently relabelled as `device_not_worn` or `source_not_synced`.
- A source or device transition is a metrology event, not a physiological event.
- Baselines use robust statistics and require minimum sample/coverage thresholds.
- Physiological findings are blocked when their own recent-data or baseline requirements are not met.
- Findings express longitudinal deviations, not diagnoses or causal conclusions.
- Health Brief is deterministic and compact; an LLM may interpret it but should not manufacture underlying measurements/findings.

## New pieces

- `019_daily_features_v1.sql`
- `020_metric_dictionary_v1.sql`
- `021_baseline_engine_v1.sql`
- `022_finding_registry_v1.sql`
- `023_missingness_source_continuity_v1.sql`
- `024_health_brief_runtime_v1.sql`
- `src/services/analysis-runtime-v1.ts`
- `src/repositories/analysis-runtime.ts`
- `src/repositories/health-brief.ts`
- `src/repositories/trends.ts`
- `src/health/missingness-v1.ts`
- tests for runtime analysis and missingness/source continuity.

## Deferred deliberately

Training load is not synthesized from duration/distance. Until a documented canonical training-load metric is imported or calculated by a versioned algorithm, `load7d` and `load28d` remain `null`.

The runtime does not infer why a wearable metric is missing. Higher-confidence missingness reasons require explicit evidence from the source/device/sync layer.
