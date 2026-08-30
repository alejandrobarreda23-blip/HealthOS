# Risk & Reference Engine V1.3

## Purpose

Raw slopes are not comparable.

A fall in systolic BP, a rise in VO2max and a rise in sleep duration cannot be
treated as three equivalent numeric slopes. Before aggregation, every metric is
mapped into a contextual health signal in the bounded interval `[-1, +1]`.

`-1` = strongly unfavorable reference state/change
` 0` = neutral / reference midpoint
`+1` = strongly favorable reference state/change

This is an analytic coordinate, not a probability of survival.

## Reference modes

### 1. Clinical/reference curve
Piecewise curves allow risk relationships that are not linear.

### 2. Nonlinear healthy range
For metrics such as sleep duration, the engine explicitly prevents
“more is always better”.

### 3. Personal robust baseline
HRV and resting HR primarily use the person's own rolling median/MAD.
This is intentionally different from pretending that a universal HRV target exists.

### 4. Age/sex population percentile
Metrics such as VO2max may use a population percentile only when Health OS has a
versioned external reference table compatible with age, sex and measurement protocol.
Without that table the engine refuses to generate a population signal.

### 5. Context-required metrics
Weight and similar measures do not receive a universal favorable direction.

## Context penalties

Acute illness, medication change, altitude change and device change reduce confidence.
They do not silently delete observations.

## Trajectory normalization

For a longitudinal series:

raw values
→ reference evaluation at each relevant point
→ bounded contextual signal
→ change in contextual signal
→ annualized contextual trajectory

That trajectory can then enter the System Evidence Engine.

## Full chain

measurement
→ provenance + method quality
→ Risk & Reference Engine
→ contextualized trajectory
→ Evidence Engine
→ system trajectory
→ future Health OS Pace

## Hard guardrails

- No unsupported age/sex reference table = no population percentile.
- No personal baseline = no personal-baseline score.
- Nonlinear variables are not assigned a universal monotonic direction.
- Context modifies confidence explicitly.
- A reference score is not a diagnosis, causal effect, biological age or mortality probability.
- Every reference is versioned and auditable.
