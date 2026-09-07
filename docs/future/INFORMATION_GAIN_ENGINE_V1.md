# HealthOS Information Gain Engine V1

Status: DESIGN + PURE DETERMINISTIC CORE (offline, not yet integrated)

## Purpose

HealthOS should not maximize measurement volume. It should identify which unresolved observation gap is most worth addressing next, given what is already known, the independence of the new information, the expected measurement reliability, and user burden.

This engine does **not** decide medical necessity and does **not** prescribe tests. It prioritizes acquisition opportunities for review.

> acquisition priority != medical priority != clinical urgency

## Inputs

The engine consumes already-normalized acquisition gap groups, not raw vendor metrics. Examples:

- `body_weight`
- `home_bp`
- `glycemic_lab`

It can also receive active measurement campaigns and source-continuity blockers.

## V1 principles

### IG-01 — Resolve observability blockers first
If a passive source discontinuity explains multiple stale streams, HealthOS should resolve or acknowledge that blocker before recommending additional passive measurements.

### IG-02 — Rank dimensions, not redundant metrics
Systolic + diastolic pressure are one `home_bp` acquisition group. Highly redundant metrics must not crowd out an independent dimension.

### IG-03 — Lexicographic policy before numerical score
Priority tier and actionability are policy decisions. They are evaluated before soft ranking signals. A Tier 1 gap is not displaced by a Tier 3 contextual variable merely because arbitrary weights are larger.

### IG-04 — Information gain is contextual
A measurement can be highly informative when a physiological domain is absent and low-value when that domain is already well covered.

### IG-05 — Reliability and burden are explicit
The engine prefers reliable, low-burden acquisition when expected information gain is otherwise similar.

### IG-06 — Review-only remains review-only
Laboratory or clinical gaps marked `review_only` may be surfaced as "review existing information / discuss with professional". The engine must not turn them into "get this test".

### IG-07 — Active campaign suppresses duplicate prompting
If a campaign is already active for a group, the engine reports it as `in_progress` and does not create a second acquisition recommendation.

### IG-08 — Unknown stays unknown
Missing reliability, independence, or contextual relevance does not default to maximal values.

## Ranking model

V1 uses a deterministic lexicographic tuple rather than a single pseudo-precise score:

1. blocker state (`source_blocker` before ordinary gap handling)
2. acquisition priority tier (1, then 2, then 3)
3. gap state severity (`missing` > `below_density` > `stale` > `observed_no_cadence`)
4. domain novelty / independence (`high` > `medium` > `low` > `unknown`)
5. measurement reliability (`high` > `medium` > `low` > `unknown`)
6. burden (`very_low` > `low` > `moderate` > `high`)
7. deterministic group-key tie break

The output exposes every ranking dimension so the result is explainable.

## Domain novelty

V1 accepts domain novelty as an upstream explicit categorical input. Later versions may derive it from the System Evidence Engine and cross-domain redundancy model. Until then, it must not be inferred from correlations alone.

Suggested meaning:

- `high`: adds a substantially absent physiological dimension
- `medium`: adds useful independent context within a partially observed dimension
- `low`: largely duplicates already dense information
- `unknown`: insufficient basis to assess independence

## Output states

- `source_blocker`
- `recommended_for_review`
- `in_progress`
- `deferred`
- `adequate`

"Recommended" means recommended for acquisition review, not a clinical prescription.

## Example with current HealthOS logic

Given strong wearable history but currently no weight, no BP and no HbA1c:

- source discontinuity may be shown separately if passive streams are stale
- `body_weight`: Tier 1, self-measurement, low burden
- `home_bp`: Tier 1, protocol-ready, low/moderate burden, potentially high domain novelty
- `glycemic_lab`: Tier 1, review-only; first action is to inspect existing labs

The engine can therefore place BP above weight if cardiovascular clinical coverage is absent and novelty is explicitly high, while still preserving `review_only` semantics for HbA1c.

## Non-goals V1

- no diagnosis
- no disease-risk prediction
- no automatic lab ordering
- no causal inference
- no "optimal" test claim
- no financial optimization
- no population-level medical guideline engine

## Future integration

After Measurement Campaigns V1 is validated:

`AcquisitionSnapshot -> InformationGainEngine -> Decision Engine -> UI`

The UI should show at most 1-3 next acquisition opportunities, each with:

- why it could add information
- burden
- acquisition mode
- what HealthOS already knows
- what remains unknown
- explicit boundary
