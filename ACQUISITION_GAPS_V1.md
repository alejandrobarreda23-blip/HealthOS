# HealthOS — Independent Acquisition Gaps V1

## Purpose
Turn missing or insufficient data into a small, explainable set of information gaps without turning those gaps into diagnoses or automatic medical testing recommendations.

## Constitutional rules
1. Missing is not abnormal.
2. Acquisition priority is not medical priority.
3. Source discontinuity is resolved before independent gaps are ranked.
4. Metrics that belong to one measurement act are grouped (e.g. systolic + diastolic BP).
5. A laboratory gap may be informationally important while remaining review-only.
6. No clinical cadence is invented when the Metric Contract does not define one.
7. Manual burden is purchased only when the expected information gain justifies it.
8. Product-policy tiers are versioned and explainable; they are not probabilities or evidence grades.

## V1 priority layers
- **Base (tier 1):** foundational coverage gaps worth resolving first from an information architecture perspective.
- **Extension (tier 2):** useful complementary coverage.
- **Context (tier 3):** contextual signals that should not displace more independent information.

## V1 actionability
- `passive`: restore/connect passive acquisition before asking for manual input.
- `self_measurement`: low-friction home/manual measurement can be incorporated when available.
- `protocol_ready`: a versioned acquisition protocol exists; HealthOS may surface it for consideration but does not prescribe it.
- `review_only`: review existing records/context before proposing a new test.
- `contextual`: request only for a targeted hypothesis or experiment.

## First independent groups
- `wearable_core`: HRV, resting heart rate, sleep, SpO2, steps.
- `body_weight`: weight trajectory.
- `home_bp`: systolic + diastolic blood pressure as one home-BP campaign.
- `glycemic_lab`: HbA1c as a metabolic coverage gap, review-only.

## Canonical BP correction
Migration 001 already defined `systolic_blood_pressure` and `diastolic_blood_pressure` as canonical keys. v1.10.2 accidentally introduced `blood_pressure_systolic` and `blood_pressure_diastolic`. v1.10.5 preserves the latter as aliases and restores the original canonical keys for all acquisition logic.

## Storage-path independence
Acquisition presence checks use `metric_acquisition_summary`, which merges dated generic observations with structured `medical_results`. This prevents a laboratory value already present in a medical document from being mislabeled as missing merely because it has not yet been mirrored into `observations`.
