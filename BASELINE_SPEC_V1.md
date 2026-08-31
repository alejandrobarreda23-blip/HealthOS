# HealthOS Baseline Specification V1

## Three temporal scales
- Recent context: 7 days.
- Personal baseline: metric-specific, commonly 42 days.
- Long trajectory: 6–12 months, descriptive rather than the primary detector baseline.

## Robust statistics
Baseline V1 uses median, MAD and P10/P25/P50/P75/P90. Robust z is `0.67448975 * (x - median) / MAD`; MAD=0 yields no z-score rather than an invented value.

## Dual baseline
HealthOS preserves `all_contexts` and may additionally calculate `reference` after explicit exclusions such as illness, major travel, known device transition or invalid data. Exclusions are never silent and never delete the underlying observations.

## Sufficiency
Each metric defines minimum samples and minimum coverage. Contextual baselines are: N<10 insufficient; 10–19 exploratory; 20–39 usable; >=40 established. These are internal sufficiency labels, not clinical claims.
