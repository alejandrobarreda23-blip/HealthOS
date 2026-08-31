# HealthOS v1.10.5 — Independent Acquisition Gaps

## What this patch adds
- Versioned acquisition-policy metadata in `metric_registry`.
- Explicit active/alias/deprecated metric-registry status.
- Safe correction of duplicated blood-pressure canonical keys introduced in v1.10.2.
- Grouped acquisition gaps: BP appears once, not as systolic + diastolic duplicates.
- Three acquisition tiers: Base / Extension / Context.
- Actionability classes that control wording and prevent laboratory gaps from becoming automatic test recommendations.
- Deterministic grouping and ranking tests.
- Acquisition summary merges generic observations and dated structured medical results, preventing false laboratory gaps.
- UI copy that explains why a gap adds information and what the non-prescriptive next step is.

## Supabase
Run `supabase/migrations/018_independent_acquisition_gaps.sql` once after 017.

## Expected real-data behavior
With the current data state, the wearable interruption remains one source-continuity card. Independent gaps should then include, if absent:
1. Weight — low-friction trajectory.
2. Home blood pressure — one protocolized campaign card, not two metrics.
3. HbA1c — metabolic coverage gap, review-only; HealthOS must first ask whether a recent result already exists and must not invent a repeat interval.

## Boundary
Acquisition priority ranks missing information. It is not clinical urgency, diagnosis, disease probability or a medical testing schedule.
