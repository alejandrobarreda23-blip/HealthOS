# PERTURBATION MODEL V1

## 1. Purpose

HealthOS needs an explicit representation of events that can plausibly alter physiology.
A perturbation is **not** inherently harmful or beneficial. It is an event/exposure that
creates a window in which a response can be studied.

Examples:
- endurance training session,
- high-intensity training,
- strength session,
- sauna / passive heat,
- altitude exposure,
- travel,
- illness episode,
- sleep restriction,
- alcohol,
- late/heavy dinner,
- medication change,
- structured N-of-1 intervention.

## 2. Epistemic classes

Each perturbation has a provenance class:

- MEASURED: directly observed by device/system.
- REPORTED: user entered.
- DERIVED: deterministic transformation from measured/reported data.
- INFERRED: model-generated hypothesis; never treated as confirmed exposure.

INFERRED perturbations must never silently become the reference event for response
analysis.

## 3. Canonical perturbation object

```ts
type Perturbation = {
  perturbationId: string
  userId: string
  perturbationType: string
  provenance: 'measured' | 'reported' | 'derived' | 'inferred'
  startedAt: string
  endedAt?: string | null
  confidence: 'low' | 'medium' | 'high' | 'confirmed'
  sourceRefs: string[]
  magnitude?: {
    value: number
    unit: string
    methodVersion: string
  } | null
  context?: Record<string, unknown>
  excludedFromAuthoritativeAnalysis?: boolean
}
```

## 4. Perturbation eligibility

A perturbation may enter authoritative response analysis only if:

1. timing is sufficiently known;
2. provenance is not INFERRED, unless manually confirmed;
3. there is a pre-event observation window;
4. there is a post-event observation window;
5. minimum data coverage for the response metric is met;
6. overlapping perturbations are either absent, explicitly modelled, or flagged as
   confounding.

## 5. Overlap

HealthOS must not pretend a clean response when multiple exposures overlap.

For every candidate response window:

```text
clean
mixed
confounded
insufficient_context
```

The default when uncertain is `mixed` or `confounded`, not `clean`.

## 6. V1 scope

V1 should support only perturbations with relatively clear timestamps:

- exercise sessions,
- sauna / passive heat,
- altitude/travel episodes,
- user-confirmed illness,
- structured experiments.

Alcohol, dinner timing, stress, and other context remain useful but should not be
required for baseline functionality.
