# Cycling climb analysis v1

Activities → Evolución en subidas analyzes the active subject only. Road, MTB and gravel remain separate; virtual and assisted cycling are excluded by declared sport. Cached summaries, not all raw streams, are loaded into the browser. Importing pending activities is sequential, resumable through the cache and stoppable between requests. A failed request stops the batch. Existing activity authorization, athlete binding and server-only credential access remain in force.

The activity-streams function requests time, heart rate, power, velocity, distance, altitude and corrected altitude. Coordinates are not requested. The pure `analyze_cycling_stream(jsonb)` database function is SECURITY INVOKER, has no table access, and is executable only by service_role. Results are saved alongside the existing stream cache with its existing subject-scoped RLS.

## Extraction

Slope is estimated as 100 × altitude change / recorded distance in a trailing window close to 100 m (75–200 m allowed for sampling). Prefer corrected altitude. Continuous uphill samples ≥1% form non-overlapping 300-second blocks. Stops (<1 m/s), descending/flat samples, non-monotonic distance and gaps >10 seconds reset the block. Speeds >25 m/s and local slopes >30% are excluded by a numerical quality rule. Short tails are omitted. These are product rules, not physiological thresholds.

Each block includes distance-weighted mean gradient, gradient min/max, distance/time speed, time-weighted HR and HR coverage. HR needs at least 270 observed seconds. Gradient bands are floor(mean slope rounded to two decimals): 2–3%, 3–4%, etc. Summaries first average blocks within each ride and then take a median across rides, avoiding domination by longer rides.

## Comparison

Source ignore flags are preserved: flagged data can be explored but never used in matching. Eligible blocks require known declared device, HR coverage ≥90%, and local gradient range ≤3 percentage points. Split eligible dates in half. Greedily match earlier to later blocks with identical sport, provider, device and altitude method, mean grade within 0.25 percentage points, at least 28 days apart, and either speed within 5% or HR within 3 bpm. Never reuse a ride. At least three pairs and three dates on each side are required for a headline delta. The delta is descriptive, not a statistical significance test or proof of adaptation. Routes, wind, body mass, equipment, temperature and sensor continuity are not controlled.

The UI exposes criteria, all selected blocks, source flags, paired values and CSV export. No patient records or real activity fixtures belong in this repository.

## Verification

Run `npm test` and `npm run build`. Run `tests/cycling-climbs.sql` against a database with migrations applied to verify constant slopes, exact non-overlapping windows, short climbs, gaps, flats and missing HR. Empty/misaligned channel inputs were also verified against the deployed function. The tests use synthetic data only.
