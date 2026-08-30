# System Evidence Engine V1.2

## Why this exists

A physiologic metric should not influence a system merely because Health OS happens to have many samples of it.

Four independent dimensions determine its effective weight:

`scientific evidence × measurement reliability × longitudinal quality × independence`

The multiplication is intentional. A weak dimension cannot be hidden by averaging it with three strong ones.

## 1. Scientific evidence
Population/outcome evidence attached to the metric itself. It is not a causal probability.

## 2. Measurement reliability
Depends on acquisition method. Example:
- VO2max via CPET: reference-grade
- VO2max via wearable: useful but penalized
- blood pressure via validated cuff: high
- domestic BIA body-fat estimate: low/moderate

## 3. Longitudinal quality
Coverage, consistency, sample count, device continuity and absence of obvious data-quality failures.

## 4. Independence
Correlated measures are penalized so Health OS does not count the same physiology repeatedly.
Examples: resting HR + HRV, fasting glucose + HbA1c, creatinine + eGFR.

## Effective contribution

`contribution = normalized longitudinal signal × effective weight`

The system aggregate retains every component so it remains inspectable.

## Guardrails
- Evidence strength is not causal certainty.
- Strong epidemiologic evidence does not rescue poor measurement.
- Many wearable samples do not overpower sparse high-quality clinical biomarkers.
- Nonlinear/range relationships cannot be reduced to “more is better”.
- Scores remain versioned and auditable.
