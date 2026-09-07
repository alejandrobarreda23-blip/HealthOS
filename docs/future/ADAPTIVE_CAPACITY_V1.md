# ADAPTIVE CAPACITY V1

## 1. Definition

In HealthOS, **adaptive capacity** is not a single number.

It is a longitudinal description of whether responses to sufficiently comparable perturbations
show stable, faster, slower, more variable, or otherwise changed recovery patterns.

V1 is descriptive only.

## 2. Preconditions

Adaptive-capacity analysis is eligible only when all are true:

1. same perturbation family;
2. comparable magnitude band;
3. compatible measurement provider/device;
4. sufficient pre-event state coverage;
5. sufficient post-event coverage;
6. confounding status is `clean` or explicitly accepted `mixed`;
7. at least 3 comparable eligible events;
8. response metric method/version is identical.

If any fail, result = `insufficient`.

## 3. Comparison unit

Never compare raw post-event values alone.

Each event contributes a response vector:

```text
pre-event anchor
response amplitude
time to recovery
recovery completeness
post-event variability
context/confounding flags
```

## 4. Event matching

V1 uses deterministic bins.

Candidate fields:
- perturbation type
- duration band
- intensity / magnitude band
- recent load band
- preceding sleep band
- altitude category
- illness status
- device/provider generation
- time-of-day band when relevant

No ML similarity in V1.

## 5. Trend classifications

Allowed:

```text
insufficient
stable
possibly_faster_recovery
possibly_slower_recovery
more_variable
less_variable
heterogeneous
```

Not allowed:

```text
adapted
maladapted
resilient
frail
biologically_younger
```

until validated for a specific context.

## 6. Evidence grades

- 0–2 eligible matched events: insufficient
- 3–4: exploratory
- 5–9: usable
- 10+: established descriptive personal pattern

These are product evidence grades, not clinical validation levels.

## 7. Recency

Recent events may be compared against earlier comparable events, but V1 must preserve both:
- event count,
- calendar span.

Three events in five days are not equivalent to three events across six months.

## 8. Stability requirement

A trend should not be emitted when one outlier drives the result.

Use robust summaries:
- median
- MAD
- Theil-Sen slope where feasible
- bootstrap later, not required in V1

## 9. Required language

Preferred:
> In the last 5 comparable sessions, median HRV recovery time was shorter than in the previous 5.

Avoid:
> Your recovery capacity improved.

## 10. Separation from Aging

Dynamic / Adaptive Aging remains separate from HealthOS Pace.

No response/recovery feature may alter the aging estimate unless:
- feature definition frozen,
- external calibration target exists,
- validation protocol passed,
- versioned model adoption approved.
