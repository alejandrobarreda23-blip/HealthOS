# Health OS Pace Framework V1.4

## We can now calculate an experimental index — but not yet claim a biological aging rate

The architecture has reached the point where Health OS can combine:
1. longitudinal observations,
2. contextual reference normalization,
3. measurement reliability,
4. scientific evidence,
5. system-level trajectories,
6. independence constraints.

That supports an **experimental global trajectory index**.

It does **not** yet support the statement:
> “You are aging at 0.82 biological years per chronological year.”

That statement requires external calibration against a validated aging target and prospective validation.

## Internal scale

The experimental index uses `1.00` as a neutral internal anchor.

- `<1.00`: aggregate trajectory is favorable inside the Health OS model.
- `≈1.00`: neutral/mixed trajectory.
- `>1.00`: aggregate trajectory is unfavorable.

The multiplier-like display is provisional UI semantics. It must always carry the word **experimental**
until calibration exists.

## Eligibility

Numeric output requires at least:
- 4 systems,
- 4 independent physiological domains,
- adequate system confidence/coverage,
- at least 90 days per included system.

A result becomes `stable_experimental` only when the common history is at least 365 days and
mean coverage is at least 70%.

## Aggregation

System weight:
`evidence × confidence × coverage`

Then:
- correlated physiology is handled upstream;
- no single domain may dominate the global aggregate;
- extreme system signals are capped;
- immature data are shrunk toward the neutral anchor;
- uncertainty widens as confidence falls.

## Why shrinkage matters

A new user with a few apparently excellent measurements should not instantly receive an extreme
“aging” score. Longitudinal maturity gradually allows the data to move the index away from neutral.

## Intervention scenarios

Health OS can now run sensitivity scenarios:
> “What would happen to the internal index if sleep-recovery improved by X?”

These are explicitly **not causal forecasts** and **not lifespan predictions**.

Later, an intervention delta may be populated from the Event Semantics / N-of-1 engine only after
the association or experiment reaches an appropriate evidence state.

## Calibration path

To convert the internal index into a defensible pace-of-aging rate, a future calibration project must:
1. freeze feature definitions and model version;
2. define an external target (e.g. validated longitudinal biological-aging measure);
3. train/calibrate on a population dataset independent from the user;
4. validate discrimination, calibration, temporal stability and subgroup performance;
5. test whether within-person changes in the Health OS index track changes in the external target;
6. publish uncertainty and failure modes.

Until then:
`Health OS Pace Experimental ≠ DunedinPACE ≠ biological years/year ≠ lifespan prediction`.
