# HealthOS — Analysis Orchestrator V1

Status: SPEC + IMPLEMENTATION CANDIDATE  
Target pipeline: `daily_features_v2 -> baselines_v1 -> findings_v1 -> health_brief_v1`

## 1. Purpose

The orchestrator is not an analytics engine. It is the execution court for deterministic analytics.
It decides **what runs, in which order, against which input state, with which version, what succeeded, what failed, and what may be published**.

It exists to prevent a recurrent failure mode: several correct modules that are never executed together, or that silently consume incompatible contracts.

## 2. Boundary

The orchestrator begins only after ingestion and normalization have succeeded.

```text
provider APIs
   -> source_records
   -> normalized observations / sessions / events
   -> [ORCHESTRATOR STARTS HERE]
      daily_features_v2
      -> baselines_v1
      -> findings_v1
      -> health_brief_v1
      -> publication barrier
```

It MUST NOT fetch Intervals.icu, normalize raw payloads, call an LLM, or invent missing data.

## 3. Constitutional rules

1. **Single entry point.** Application code requests one analysis run; screens never manually chain analytics stages.
2. **Strict DAG.** A downstream stage never runs if an upstream required stage failed.
3. **Idempotence.** Same user + as-of date + pipeline version + input fingerprint resumes/reuses the same logical run.
4. **No silent partial publication.** A run is consumer-visible only after every required stage succeeds.
5. **Version everything.** Pipeline and every stage have explicit versions.
6. **Input identity is explicit.** The run records a deterministic fingerprint of the normalized state and contract versions it consumed.
7. **Failure is data.** Stage, error code and error message are persisted.
8. **Retry is resume, not duplication.** Completed stages are not rerun unless their stage version or input fingerprint changed.
9. **Derived outputs remain traceable.** Persisted derived entities should carry `analysis_run_id` where supported.
10. **No LLM computation.** Every output in this pipeline is deterministic.
11. **Missing != zero.** Absence propagates as absence/insufficient evidence, never as numeric zero.
12. **Metric Contract is a gate.** Contract validation runs before analytics and can fail the run before any derived write.

## 4. Stages

### S0 — contract_gate_v1
Validates Metric Dictionary / Feature Registry producer-consumer contracts.

Failure means **no analytics stage runs**.

### S1 — daily_features_v2
Consumes normalized entities only.

Responsibilities:
- canonical daily aggregation;
- aggregation method comes from metric semantics, never generic SQL `avg()`;
- preserves missing days;
- writes versioned provider-neutral features.

### S2 — baselines_v1
Consumes `daily_features_v2` and/or canonical metric observations according to the baseline contract.

Responsibilities:
- median, MAD, percentiles, coverage, sample sufficiency;
- all-context and reference baselines where available;
- no silent contextual exclusion.

### S3 — findings_v1
Consumes declared feature/baseline inputs only.

Responsibilities:
- run deterministic detectors;
- persist evidence, confounders, interpretation boundary and detector version;
- insufficient evidence suppresses physiological conclusions.

### S4 — health_brief_v1
Consumes only declared outputs from prior stages and contextual events.

Responsibilities:
- compact deterministic summary;
- no causal inference;
- preserve uncertainty and provenance.

### S5 — publish_v1
Atomic logical publication barrier.

A publication pointer may reference only an `analysis_runs` row with status `succeeded`.
Consumers that require a coherent cross-layer snapshot use the latest published run.

## 5. Run state machine

```text
queued
  -> running
      -> succeeded -> published
      -> failed
```

A failed run remains inspectable. It is never relabelled as succeeded. A retry either resumes the same logical run when the input fingerprint is unchanged, or creates a new run when the input state changed.

## 6. Stage state machine

```text
pending -> running -> succeeded
                  -> failed
pending -> skipped   (only for explicitly optional stages; none in V1 core)
```

Core V1 stages are required. `skipped` is reserved for future optional modules and MUST NOT be used to conceal unavailable required inputs.

## 7. Input fingerprint

The orchestrator does not hash raw values ad hoc inside every detector. It receives one canonical input fingerprint generated from normalized state identity plus contract versions.

Recommended canonical material:

```json
{
  "user_id": "...",
  "as_of_date": "2026-08-30",
  "normalized_revision": {
    "observations": [{"id":"...","updated_at":"..."}],
    "exercise_sessions": [{"id":"...","updated_at":"..."}],
    "events": [{"id":"...","updated_at":"..."}]
  },
  "metric_contract_version": "metric_contract_v1",
  "feature_registry_version": "feature_registry_v1",
  "pipeline_version": "analysis_pipeline_v1"
}
```

Arrays MUST be sorted before SHA-256. Do not fingerprint only row counts: 886 rows can change values while remaining 886 rows.

## 8. Publication semantics

HealthOS distinguishes **computed** from **published**.

A stage may have durable idempotent writes while a later stage fails. Those rows are not automatically a coherent user-facing snapshot. `analysis_publications` is the consistency boundary.

For V1:
- Today / Health Brief should read the latest published run.
- A diagnostic/admin view may inspect an unpublished failed run.
- Trends may read versioned daily features directly only if it clearly declares the feature version and does not imply whole-pipeline success.

## 9. Partial failure

Example:

```text
contract_gate      succeeded
daily_features     succeeded
baselines          succeeded
findings           FAILED
health_brief       not run
publication        not run
```

Required behavior:
- prior successful writes remain auditable;
- no publication pointer moves;
- previous successful publication remains active;
- retry resumes from `findings` if fingerprint + stage versions are unchanged.

## 10. Idempotence keys

Logical run identity:

```text
(user_id, as_of_date, pipeline_key, pipeline_version, input_fingerprint)
```

Stage identity:

```text
(run_id, stage_key)
```

Artifact-level idempotence remains the responsibility of each stage's persistence contract.

## 11. Failure taxonomy

Minimum codes:

```text
CONTRACT_VIOLATION
INPUT_FINGERPRINT_ERROR
DAILY_FEATURES_FAILED
BASELINE_FAILED
FINDING_FAILED
HEALTH_BRIEF_FAILED
PERSISTENCE_FAILED
PUBLICATION_FAILED
UNEXPECTED_ERROR
```

No generic `Something went wrong` is sufficient in persisted run state.

## 12. Observability

Every run records:
- `run_id`
- user/date
- pipeline key/version
- input fingerprint
- status
- started/completed timestamps
- failed stage/code/message

Every stage records:
- stage key/version
- status
- input/output fingerprint when available
- row counts / diagnostics JSON
- duration timestamps
- error fields

This is the primary audit trail for execution. It complements, rather than replaces, entity-level provenance.

## 13. Consumer rule

Screens do not orchestrate.

Forbidden:

```ts
await refreshDailyFeatures();
await refreshBaselines();
await refreshFindings();
```

Allowed:

```ts
await runAnalysisPipelineV1(...);
```

The Data screen may trigger the orchestrator after successful normalization, but it does not know the internal stage sequence.

## 14. Real-data validation gate

A detector is not `VALIDATED` because the orchestrator ran it successfully.

Maturity remains separate:

```text
SPEC -> IMPLEMENTED -> VALIDATED -> SUPERSEDED/RETIRED
```

Orchestration success proves execution integrity, not physiological validity.

## 15. First retrospective validation target

Once merged and wired to real data, the first useful validation should be a known high-load period. The harness must define the period and relevant facts independently of detector output, then inspect whether training/recovery signals appear with appropriate timing and without excessive false positives.

This is a test of detector behavior, not a requirement to force a specific finding.
