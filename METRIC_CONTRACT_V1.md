# HealthOS Metric Contract V1 — acquisition extension

A metric key is a canonical physiological identity, not a vendor field. Raw vendor payloads remain in `source_records`; normalized observations reference canonical `metric_key`s.

Required semantic dimensions include canonical unit, data level, domain, physiological-day rule, plausible range, aggregation/baseline policy, missingness, provenance and version. V1.10 adds acquisition semantics so HealthOS can distinguish continuous streams from periodic high-information measurements.

## Acquisition modes
`passive_continuous | passive_daily | home_periodic | episodic_protocol | laboratory_periodic | clinical_episodic | manual_contextual`

## Manual burden
`none | very_low | low | moderate | high`

## Longitudinal roles
`state | trajectory | dynamics | adaptation | context`

## Examples
### HRV RMSSD
- mode: `passive_daily`
- continuous required: preferred, not logically mandatory
- role: dynamics
- burden: none

### Home blood pressure
- mode: `episodic_protocol`
- continuous required: false
- protocol: `home_bp_campaign_v1`
- role: state + trajectory
- event-triggered reassessment: true
- burden: low

### HbA1c
- mode: `laboratory_periodic`
- continuous required: false
- role: trajectory
- burden: low

No cadence field is itself a clinical recommendation. Protocols are versioned and can be superseded.
