# RECOVERY KINETICS V1

## 1. Fundamental idea

A single post-event value is weak information. The useful primitive is a **trajectory
back toward an individual reference state**.

HealthOS should estimate recovery only for metrics with:
- adequate pre-event baseline,
- adequate post-event density,
- explicit direction semantics,
- stable enough measurement conditions.

## 2. Baseline anchor

For response/recovery analysis, use a pre-perturbation local anchor rather than blindly
using the long-term personal baseline.

Suggested V1 anchor:

```text
median of eligible observations in [-7d, -1d]
```

with:
- minimum 3 valid observations,
- contextual exclusions,
- provider continuity check.

If insufficient, recovery result = `INCONCLUSIVE`.

## 3. Response amplitude

For metric x:

```text
response_amplitude =
  signed_deviation(post_event_extreme, pre_event_anchor)
```

Use metric-specific normalization:
- robust z when enough history,
- percent change only when mathematically/physiologically meaningful,
- absolute difference when units are directly interpretable.

No universal cross-metric z-summing in V1.

## 4. Time to recovery

Define a recovery band around the pre-event anchor.

Example deterministic rule:

```text
recovered_at =
  first timepoint after perturbation where metric returns inside recovery band
  and remains inside for N subsequent eligible observations
```

The band is metric-specific and versioned.

Never hardcode one tolerance for HRV, RHR, sleep, SpO2, weight, etc.

## 5. Recovery completeness

Canonical statuses:

```text
not_started
partial
recovered
overshoot
not_recovered_within_window
inconclusive
```

`overshoot` is descriptive only; it is not automatically positive.

## 6. Candidate outputs

```ts
type RecoveryResult = {
  metricKey: string
  perturbationId: string
  anchorValue: number | null
  responseAmplitude: number | null
  responseDirection: 'up' | 'down' | 'mixed' | 'none' | 'unknown'
  recoveryStatus:
    | 'not_started'
    | 'partial'
    | 'recovered'
    | 'overshoot'
    | 'not_recovered_within_window'
    | 'inconclusive'
  timeToRecoveryHours: number | null
  recoveryCompleteness: number | null
  coverage: number
  confoundingStatus: 'clean' | 'mixed' | 'confounded' | 'insufficient_context'
  methodVersion: string
}
```

`recoveryCompleteness` may be numeric internally for geometry, but UI should prefer the
categorical status until validated.

## 7. First candidate metrics

V1:
- HRV RMSSD
- resting heart rate
- sleep duration / sleep regularity
- possibly overnight SpO2 when measurement reliability is adequate

Defer:
- body weight for acute recovery,
- HbA1c,
- blood pressure unless measurement protocol supports sufficient temporal density.

## 8. Important boundary

A slower recovery is not automatically pathology.
A larger response is not automatically pathology.
A smaller response is not automatically fitness.
Interpretation requires perturbation type, magnitude, context, and repeated comparison.
