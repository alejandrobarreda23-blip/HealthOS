# HealthOS Source Continuity V1 — v1.10.4

## Purpose
HealthOS must not translate missing wearable data into physiology.

When several passive metrics from the same provider become stale at the same time, the runtime emits one **source continuity** signal instead of multiple independent measurement recommendations.

## Deterministic rule V1
A source signal is created when:
- at least 3 passive metrics are stale;
- they share the same latest provider;
- their end dates are aligned within 1 day.

The signal does **not** determine why data stopped. Possible causes include:
- wearable not worn;
- sync not run;
- connectivity;
- permissions;
- provider/API interruption.

These causes remain unknown unless independently observed/reported.

## Epistemic boundary
`SOURCE_DISCONTINUITY` is an acquisition/system state, not a physiological finding.

Missing data must never be interpreted as zero, normality, deterioration, recovery or disease.
