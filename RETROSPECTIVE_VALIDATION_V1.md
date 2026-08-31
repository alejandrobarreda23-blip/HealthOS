# HealthOS — Retrospective Validation Harness V1

Status: SPEC + IMPLEMENTATION CANDIDATE

## Purpose
Validate deterministic detectors against known periods in real longitudinal history without hardcoding the expected detector outcome.

The harness evaluates whether detector behavior is compatible with a pre-declared real-world episode, while preserving uncertainty and avoiding circular validation.

## Core rule
A validation case describes the historical episode and admissible observable expectations before the detector output is inspected.
It does not encode "detector X must fire" as ground truth.

## Validation states
- SUPPORTED: detector output is temporally and evidentially compatible with the case.
- NOT_OBSERVED: the expected observable signal is absent despite sufficient data.
- INCONCLUSIVE: data coverage, source continuity, confounding or timing prevents a fair judgment.
- CONTRADICTED: detector output materially conflicts with the pre-declared case evidence.

## Case anatomy
Each case MUST contain:
- case_id
- title
- status: draft | locked | evaluated | retired
- episode_start / episode_end
- evaluation_window_before_days
- evaluation_window_after_days
- known_facts[]
- expected_observables[]
- excluded_claims[]
- relevant_metrics[]
- relevant_findings[]
- minimum_data_requirements
- confounders[]
- source_continuity_requirements
- case_version
- locked_at

## No-leakage rule
Once a case is LOCKED:
- episode dates may not be moved to fit detector outputs;
- expected observable direction may not be changed to fit results;
- minimum coverage may not be weakened post hoc;
- detector thresholds may not be tuned against that same case and then re-validated on it.

If a detector is modified because of a case, that case becomes DEVELOPMENT evidence and cannot count as independent validation for the new detector version.

## Observable expectation model
Expectations should be physiological/data-level observations rather than detector-specific instructions.

Good:
- recent training load is materially elevated relative to preceding personal history
- HRV may be below recent personal reference after the episode
- resting HR may be elevated after the episode

Bad:
- `acute_training_load_increase` must trigger on 2026-08-15
- robust_z must be below -1.5

## Temporal tolerance
Detector outputs are evaluated over:

[episode_start - before_days, episode_end + after_days]

The harness records:
- first_detected_date
- overlap_days
- lag_days_from_episode_start
- lag_days_from_episode_end
- duration_days

Temporal proximity is evidence, not proof of causation.

## Data sufficiency gate
A detector cannot be judged NOT_OBSERVED when required input data are insufficient.
Insufficient coverage forces INCONCLUSIVE.

Examples:
- HRV 2/7 days: cannot fairly judge sustained HRV behavior.
- training sessions complete but recovery metrics absent: training-load detector can be judged; recovery-load mismatch cannot.

## Source continuity gate
If a source transition overlaps the validation window and comparability is unknown, affected metric validation becomes INCONCLUSIVE unless the detector explicitly models the transition.

## Confounders
Confounders are recorded, never silently removed.
A result may be SUPPORTED with confounders present, but the report must state that the case does not establish causality.

## False-positive neighborhood
Every case also inspects a surrounding control window.
Default:
- 21 days before evaluation window
- 21 days after evaluation window

The harness records detector activations outside the episode window.
A detector that fires continuously may detect the episode but still fail usefulness review.

## Evaluation output
Each case evaluation yields:
- case_id
- detector_key
- detector_version
- result
- evidence_strength
- data_sufficiency
- temporal_alignment
- false_positive_burden
- observed_findings[]
- missing_inputs[]
- confounders[]
- source_discontinuities[]
- interpretation_boundary
- evaluated_at

## Validation maturity
Detector maturity is tracked separately from software maturity:

SPEC
IMPLEMENTED
TECHNICALLY_VERIFIED
RETROSPECTIVELY_SUPPORTED
PROSPECTIVELY_SUPPORTED
SUPERSEDED

No detector becomes "validated" from synthetic unit tests alone.

## Initial HealthOS retrospective cases

### RV-001 — High-load mountain block
Purpose: evaluate training-load and recovery/load detectors against a known multi-day unusually demanding mountain episode.

The case should be locked from calendar/training history before detector outputs are inspected.

Relevant observables:
- elevated exercise duration/load relative to preceding baseline;
- possibly elevated distance/elevation gain;
- possible subsequent HRV reduction and/or resting-HR elevation if recovery data exist.

Relevant detectors:
- acute_training_load_increase
- recovery_load_mismatch
- sustained_hrv_drop
- sustained_rhr_elevation

Excluded claim:
- the episode "caused" any recovery change.

### RV-002 — Wearable-off gap
Purpose: ensure missing periods produce insufficient-data behavior, not zeros or fabricated physiological findings.

Expected observable:
- core wearable coverage materially reduced/absent.

Relevant detector:
- insufficient_recent_data

Required invariant:
- no synthetic HRV/sleep/RHR values appear in the gap.

### RV-003 — Stable ordinary training period
Purpose: negative-control case for false-positive burden.

Expected observable:
- no known unusual training block or illness episode.

This case is useful only after being locked independently of detector output.

## Separation of development and validation sets
Cases are tagged:
- DEVELOPMENT
- VALIDATION
- HOLDOUT

If thresholds are changed after reviewing a case, that case is DEVELOPMENT for the new detector version.
At least one untouched HOLDOUT case is required before claiming retrospective support.

## CI role
CI validates harness mechanics, schemas and invariants.
CI MUST NOT claim physiological validity.

CI tests:
- locked case immutability
- insufficient data => INCONCLUSIVE, never NOT_OBSERVED
- detector version captured
- source discontinuity propagated
- false-positive neighborhood calculated
- no detector-specific hardcoded expected trigger date in case schema
- evaluation reproducibility from same inputs

## Publication rule
Retrospective evaluation results are evidence artifacts. They do not silently mutate detector thresholds.
Any detector change must be a new version and reference the evidence that motivated it.
