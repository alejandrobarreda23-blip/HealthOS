# Aging / Longevity Method V1.0

## Metrics are not interchangeable

### Chronological age
Deterministic calendar quantity.

### Clinical PhenoAge
Published-formula estimate based on chronological age plus nine routine clinical biomarkers.
Health OS requires strict normalized units and keeps source provenance.

### DunedinPACE
External validated DNA-methylation result only.
Health OS MUST NOT label a wearable-derived estimate as DunedinPACE.

### Health OS Longitudinal Pace
A future proprietary longitudinal estimator using repeated multi-system changes.
Version `healthos-pace-v0` deliberately returns no numeric rate, even when enough data exist,
until calibration and validation rules are specified.

## Display contract
Every aging metric must expose:
- value
- unit
- algorithm
- version
- evidence class
- confidence
- data coverage
- missing inputs
- calculation date

## Motivation without deception
The UI may reward increased coverage and show modifiable drivers before it can legitimately
show biological-age or pace estimates. Missing data are presented as an opportunity to improve
resolution, not as a health deficit.
