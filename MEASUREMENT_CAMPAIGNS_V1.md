# HealthOS — Measurement Campaigns V1

## Constitutional rule
A campaign is a temporary acquisition protocol, not a diagnosis. `completed` means that the recorded dataset satisfies the minimum formal protocol requirements chosen by HealthOS/the professional; it does not mean normal, abnormal, clinically interpreted, or medically cleared.

## Storage model
`measurement_campaigns` stores a versioned snapshot of the protocol. The physiological measurements remain canonical:

- `measurement_groups` represents a measurement act/session;
- `observations` stores atomic measured values;
- `campaign_id`, `protocol_day`, `protocol_occasion`, and `reading_index` preserve protocol context.

No parallel campaign-measurement silo is created.

## V1 workflows
- Weight: low-friction point measurement into canonical `weight` observations.
- Home BP: versioned `home_bp_campaign_v1`; paired systolic/diastolic observations grouped per cuff reading.
- Laboratory gaps: remain `review_only`; V1.12 does not prescribe a new laboratory test.

## Completion
The home BP registry currently defines 3 minimum and 7 preferred days. HealthOS permits explicit completion after the minimum is reached and exposes whether the preferred target has been reached. Missing occasions remain missing.
