# Aging Systems V1.1

Health OS now models aging as trajectories across distinct physiological systems.

## Systems
- cardiovascular
- metabolic
- fitness
- sleep/recovery
- body composition
- inflammation
- renal

## Each assessment stores
- system
- status: insufficient / stable / improving / worsening / mixed
- normalized score
- annualized normalized slope
- confidence
- coverage
- days observed
- metrics used
- missing metrics
- evidence
- computation version

## Important rule
The score is a UI convenience, not a biological age.

The scientifically meaningful primitive is the longitudinal trajectory of each metric and the confidence with which that trajectory can be estimated.

## Aggregation rule for future Health OS Pace
A future global pace must:
1. require multiple independent systems;
2. weight by reliability/coverage rather than sensor volume;
3. normalize directionality (e.g. falling resting HR may be favorable, rising VO2max favorable);
4. avoid double-counting correlated metrics;
5. retain system-level contributions;
6. refuse output when longitudinal coverage is inadequate.
