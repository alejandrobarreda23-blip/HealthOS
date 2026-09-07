# DYNAMIC PHYSIOLOGY VALIDATION PLAN V1

## Objective

Prevent the new response/recovery layer from becoming a visually persuasive but
scientifically weak narrative engine.

## Gate 1 — Technical

- deterministic output;
- idempotent re-runs;
- explicit algorithm version;
- no interpolation across missing periods;
- provider discontinuity blocks authoritative comparison;
- unknown context remains unknown.

## Gate 2 — Synthetic cases

Create fixtures for:
1. clear recovery;
2. no recovery;
3. isolated return followed by relapse;
4. missing post-event data;
5. provider switch;
6. overlapping exercise + illness;
7. two events with different magnitudes;
8. same event type but insufficient comparability.

## Gate 3 — Real retrospective cases

Lock cases *before* viewing detector output.

Good early candidates:
- known mountain / altitude block;
- ordinary training blocks;
- wearable-off period as a negative control;
- sauna exposures if timestamps exist;
- illness periods only when user-confirmed.

Outcomes:
- SUPPORTED
- NOT_OBSERVED
- INCONCLUSIVE
- CONTRADICTED

## Gate 4 — Repeated-event validity

Do not surface comparative recovery claims until:
- >=3 eligible comparable events;
- <=1 day provider alignment issue;
- sufficient pre/post coverage;
- no critical unresolved confounding.

## Gate 5 — Prospective

For claims about changing recovery/adaptive capacity:
- freeze method version;
- prospectively define eligible perturbations;
- run for at least 8-12 weeks;
- compare predicted/expected recovery pattern against future observations.

## UI language ladder

Allowed early:
- "After this session, resting HR returned to its local reference in ~36 h."
- "Recent comparable sessions have shown shorter recovery times."

Not allowed early:
- "Your resilience is improving."
- "Your biological age is decreasing."
- "Your systemic health is better."
- "This caused your HRV change."
