# HealthOS — Visible Aging V1

## Purpose

Visible Aging is a sibling layer of physiological Aging. It studies how the organism's external phenotype changes over time without treating appearance as biological age.

It does **not** publish beauty scores, attractiveness, facial age, biological age from photographs, or causal claims from temporal coincidence.

## Acquisition principle

Maximum information, minimum user burden.

### Passive by default
Visible Aging reuses context that HealthOS already has: sleep, HRV, resting heart rate, weight when available, and training context. These variables are context, not proof that they caused a visible change.

### Sparse visual campaigns
The default visual protocol is one campaign every 56 days: frontal, 45-degree, profile. Target burden: ~90 seconds. No recurring questionnaire.

### Event-driven manual input
Important interventions are entered once: photoprotection, retinoid/retinol, skin treatment, hair treatment, strength training, body-composition intervention, or another material change. Routine habits are not requested repeatedly.

## Data model

- `visible_aging_photo_sessions`: visual campaign metadata and private Storage paths; protocol snapshot preserved per session.
- `visible_aging_interventions`: sparse user-reported interventions; contextual events, not causal labels.
- `visible_aging_observations`: reserved for future versioned image-analysis outputs. Browser clients have no write policy.

## Privacy

Photographs are stored in the private `visible-aging-private` bucket. Owners write only below their own `user_id/` prefix. Read access follows HealthOS multiuser data scope.

## Evidence model

One campaign = baseline only. Two or more comparable campaigns = descriptive visual trajectory can begin. No trend is interpreted as rejuvenation until the underlying metric and analysis method are validated.

## Future image pipeline

A future version may calculate reproducible within-person descriptors such as pigmentation uniformity, texture proxies, erythema proxies, periocular contrast, facial contour proxies, and apparent hair-density proxies. Every derived metric must carry metric key, epistemic level, method version, confidence, date, source session, and metadata.

AI may assist interpretation, but authoritative image-derived values must come from a versioned analysis method.
