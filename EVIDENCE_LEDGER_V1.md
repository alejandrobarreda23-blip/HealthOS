# HealthOS Evidence Ledger V1

## Purpose

The ledger is the chain of custody for claims about HealthOS itself.

It answers:
- What exactly was tested?
- Which version?
- Against which inputs?
- Under which protocol?
- What evidence justified the current maturity state?
- What changed later?

## Ledger record

Each evidence record contains:
- evidence_id
- component_key
- component_version
- evidence_type
- status (`accepted`, `rejected`, `superseded`)
- observed_at
- actor (`ci`, `runtime`, `human`, `validation_harness`, `migration`)
- source_ref
- input_fingerprint where applicable
- run_id where applicable
- case_id/case_version where applicable
- result payload
- artifact hash where applicable
- notes

## Evidence is factual, transitions are judgments

A CI run saying "66/66 tests passed" is evidence.

"Therefore the detector is retrospectively supported" is a transition judgment and requires the appropriate evidence policy.

This separation is intentional.

## Example

Evidence:

```
CI_RUN
component=metric_contract@1
result=success
commit=abc123
checks=[typecheck, test, build]
```

Transition:

```
metric_contract@1
IMPLEMENTED -> TECHNICALLY_VERIFIED
evidence=[ev_ci_123, ev_contract_124]
```

## Real-data execution evidence

A REAL_DATA_RUN should include at minimum:

```
run_id
input_fingerprint
physiological_date_start
physiological_date_end
input_counts
output_counts
component_version
started_at
completed_at
result
quality_summary
```

No PHI/raw payload needs to be duplicated in the ledger. The ledger references the underlying protected records and stores fingerprints/counts/provenance.
