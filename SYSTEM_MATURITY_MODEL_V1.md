# HealthOS System Maturity Model V1

Status: SPEC + implementation candidate

## Purpose

HealthOS must distinguish software existence from evidential validity. A detector, pipeline, metric definition, connector, or derived model is not "validated" merely because code exists or tests pass.

The maturity model creates an auditable state machine for every material HealthOS component and an Evidence Ledger that records the exact evidence supporting each transition.

## Core rule

> No component may advance maturity without explicit evidence records satisfying the transition policy for its component class.

No module can self-certify merely because a deployment completed successfully.

## Maturity states

1. `SPEC`
   - Behavior and contract defined.
   - No claim that runnable code exists.

2. `IMPLEMENTED`
   - Code exists in repository.
   - Repository path and version/commit are recorded.

3. `TECHNICALLY_VERIFIED`
   - Static/type checks and required tests pass in CI.
   - Migrations/build checks pass where applicable.
   - This proves software execution properties, not physiological validity.

4. `REAL_DATA_EXECUTED`
   - Component has executed against genuine longitudinal HealthOS data.
   - Run identity, dataset fingerprint, date range and outputs are recorded.
   - Successful execution is not evidence that an interpretation is correct.

5. `RETROSPECTIVELY_SUPPORTED`
   - Applicable only to components making empirical/physiological interpretations.
   - Locked retrospective cases support the behavior under the Retrospective Validation protocol.
   - Development cases cannot independently validate the same algorithm version they calibrated.

6. `PROSPECTIVELY_SUPPORTED`
   - Applicable only where prospective validation is meaningful.
   - Pre-registered future cases/experiments support the component.

7. `SUPERSEDED`
   - Replaced by a newer version. Historical evidence remains immutable.

8. `RETIRED`
   - Intentionally withdrawn. Historical evidence remains immutable.

## Component classes

- `metric_definition`
- `feature_definition`
- `connector`
- `normalizer`
- `pipeline`
- `detector`
- `baseline_algorithm`
- `health_brief`
- `ui_consumer`
- `experiment_protocol`
- `scientific_rule`

Not every component class uses every maturity level. For example, a UI consumer normally stops at REAL_DATA_EXECUTED; a detector may progress to RETROSPECTIVELY_SUPPORTED and PROSPECTIVELY_SUPPORTED.

## Evidence classes

Evidence is append-only and typed:

- `SPEC_DOCUMENT`
- `REPO_ARTIFACT`
- `CI_RUN`
- `MIGRATION_CHECK`
- `CONTRACT_TEST`
- `UNIT_TEST`
- `INTEGRATION_TEST`
- `BUILD`
- `REAL_DATA_RUN`
- `RETROSPECTIVE_CASE`
- `PROSPECTIVE_CASE`
- `SOURCE_CONTINUITY_CHECK`
- `DATA_QUALITY_CHECK`
- `HUMAN_REVIEW`
- `DEPRECATION_NOTICE`

Evidence never changes meaning after creation. Corrections create new evidence and may mark old evidence as superseded, but do not rewrite history.

## Transition policy

### SPEC -> IMPLEMENTED
Requires:
- SPEC_DOCUMENT
- REPO_ARTIFACT
- repository version/commit

### IMPLEMENTED -> TECHNICALLY_VERIFIED
Requires all required checks for the component class. At minimum:
- CI_RUN success
- relevant CONTRACT_TEST/UNIT_TEST/INTEGRATION_TEST
- BUILD when executable/bundled
- MIGRATION_CHECK when schema-affecting

### TECHNICALLY_VERIFIED -> REAL_DATA_EXECUTED
Requires:
- REAL_DATA_RUN success
- immutable `input_fingerprint`
- concrete date range
- algorithm/component version
- output identity/counts
- DATA_QUALITY_CHECK or explicit quality metadata

### REAL_DATA_EXECUTED -> RETROSPECTIVELY_SUPPORTED
Only for empirical components.
Requires:
- at least one locked validation case not used for calibration
- retrospective evaluator result supported under the current algorithm version
- no unresolved blocking source-continuity issue for that case

The policy intentionally does not declare a universal minimum number of cases in V1. The ledger records N and case class; later evidence policy can require stronger thresholds per detector class.

### RETROSPECTIVELY_SUPPORTED -> PROSPECTIVELY_SUPPORTED
Requires:
- prospective case/experiment registered before outcome availability
- successful evaluation under unchanged algorithm version, or explicit version relationship

### Any active state -> SUPERSEDED
Requires:
- replacement component key/version
- DEPRECATION_NOTICE
- reason

### Any active state -> RETIRED
Requires:
- DEPRECATION_NOTICE
- reason

## Evidence strength is not maturity

`evidence_strength` used inside physiological findings is not the same as component maturity.

Example:
- a `sustained_hrv_drop` finding can have `evidence_strength=HIGH` on a particular week;
- the detector implementation producing it may still only be `REAL_DATA_EXECUTED` if retrospective validation has not been completed.

These dimensions must never be conflated.

## Version identity

Maturity belongs to a component version, not merely to a component name.

`detector:sustained_hrv_drop@2.0.0` and `detector:sustained_hrv_drop@2.1.0` have separate evidence histories.

A new version does not automatically inherit empirical maturity from its predecessor. V1 allows explicit `evidence_carryover` records, but carryover must state why the change is non-material and may never be silent.

## Evidence Ledger invariants

1. Evidence is append-only.
2. Every evidence row identifies component key + component version.
3. Every transition records the evidence IDs used to justify it.
4. A maturity transition cannot refer to evidence from another component version unless a declared carryover exists.
5. CI evidence cannot by itself establish retrospective/prospective support.
6. REAL_DATA_RUN must include input fingerprint and run ID.
7. Retrospective validation evidence must identify case ID, case version, lock timestamp, detector version and evaluation result.
8. `SUPERSEDED` and `RETIRED` never delete historical evidence.
9. Human review is explicit evidence, never an invisible override.
10. The current state is derived from accepted transitions, not manually overwritten.

## Recommended UI language

Do not show "validated" as a generic badge.

Prefer precise labels:
- Designed
- Implemented
- CI verified
- Executed on real data
- Retrospectively supported
- Prospectively supported
- Superseded

## CI integration

CI should fail if:
- an `IMPLEMENTED` component points to a missing repo artifact;
- a component claims `TECHNICALLY_VERIFIED` without required evidence;
- metric/feature contract tests fail;
- a migration expected by a component is absent;
- evidence fixtures contain impossible transitions.

CI must NOT automatically promote empirical maturity. It may create/verifiably emit CI evidence, but retrospective/prospective transitions remain separate actions backed by validation evidence.

## First HealthOS candidates

Initial records should include, conservatively:

- `connector:intervals_icu_rapid_service@1` -> at least REAL_DATA_EXECUTED once vendored and CI verified.
- `normalizer:intervals_wellness_v1@1` -> REAL_DATA_EXECUTED.
- `normalizer:intervals_exercise_v1@1` -> REAL_DATA_EXECUTED.
- `pipeline:analysis_orchestrator_v1@1` -> SPEC until merged/CI/run.
- `detector:sustained_hrv_drop@2` -> no higher than REAL_DATA_EXECUTED until retrospective cases are run.
- `metric_contract@1` -> TECHNICALLY_VERIFIED after contract checks pass in repo CI.

The exact initial state must be created from actual repository/CI evidence at integration time; do not backfill optimistic states from memory.
