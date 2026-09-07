# DYNAMIC RESPONSE ENGINE V1

## 1. Goal

Create a reproducible engine that compares how the same person responds to comparable
perturbations over time.

The engine must answer increasingly difficult questions:

1. What changed after the event?
2. How long did it take to return?
3. Was the response similar to previous comparable events?
4. Is recovery becoming faster/slower over repeated comparable exposures?
5. Is the organism showing adaptation, loss of reserve, or simply different context?

V1 should implement only 1-3.

## 2. Pipeline

```text
eligible perturbation
   ↓
pre-event state
   ↓
post-event response window
   ↓
metric-level response signatures
   ↓
recovery kinetics
   ↓
multisystem response signature
   ↓
comparison against matched historical perturbations
```

## 3. Matching

Comparisons should be within-person and matched before any conclusion.

Candidate matching dimensions:
- perturbation type,
- intensity/magnitude band,
- duration band,
- time of day,
- preceding sleep,
- recent training load,
- altitude,
- illness flag,
- provider/device continuity.

V1 should use coarse deterministic bins rather than machine-learned similarity.

## 4. Multisystem signature

A signature is not a score.

```ts
type MultisystemResponseSignature = {
  perturbationId: string
  metrics: RecoveryResult[]
  systemsRepresented: string[]
  coverage: number
  confoundingStatus: 'clean' | 'mixed' | 'confounded' | 'insufficient_context'
  signatureVersion: string
}
```

The engine may state:

> HRV decreased, resting HR increased, and both returned to local reference within
> approximately 36 hours.

It must not state:

> systemic health = 82/100.

## 5. Comparable-event summary

For a set of matched events:

```ts
type ComparableResponseSummary = {
  perturbationType: string
  eventCount: number
  eligibleEventCount: number
  medianTimeToRecoveryHoursByMetric: Record<string, number | null>
  variabilityByMetric: Record<string, number | null>
  trendClassification:
    | 'stable'
    | 'possibly_faster'
    | 'possibly_slower'
    | 'heterogeneous'
    | 'insufficient'
  evidenceGrade: 'exploratory' | 'usable' | 'established'
  methodVersion: string
}
```

No trend classification should be produced from fewer than 3 comparable eligible events.

## 6. Evidence thresholds

Suggested V1:
- 0-2 comparable events -> insufficient
- 3-4 -> exploratory
- 5-9 -> usable
- 10+ -> established for descriptive within-person pattern only

These are product thresholds, not clinical validation.

## 7. Adaptation boundary

Do **not** label repeated faster recovery as "adaptation" in authoritative UI until:
- perturbation comparability is adequate,
- at least 5 eligible comparable events,
- trajectory is stable,
- confounding burden is low,
- method passes retrospective validation.

Before that use:
> "recovery has been faster in recent comparable sessions"

not:
> "your adaptive capacity improved".
