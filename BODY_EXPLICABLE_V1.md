# Body explicable — first delivery

Body, Trends and the analysis runtime now use `canonical_daily_v2`. This delivery reads existing observations and sessions; it adds no database migration and does not trigger refreshes on navigation.

## Data contract

- One value per physiological date and metric, from one source/device/normalizer identity. Provider preference is explicit in the metric dictionary; ties are deterministic.
- Canonical units are required from storage. Explicit conversions cover weight in lb and sleep in hours/seconds. Missing or incompatible units and non-finite values are ineligible, never zero.
- Duplicate record IDs do not increase daily weight. Independent measurements retain their multiplicity. Legacy inputs without IDs are deduplicated by interval and value.
- Health Connect steps and sleep intervals are summed only when their timestamps are valid and non-overlapping; ambiguous interval groups are ineligible. Other supported observations use the daily median of the selected source.
- Daily observations retain source identity and input IDs. Coverage and baselines count distinct days.
- Comparisons use only the latest uninterrupted source segment, up to the selected date. Source transitions may leave the new segment without a sufficient baseline. A-B-A transitions do not reconnect the old reference.
- Physiological absence, absent exercise records and zero are different concepts. A lack of sessions is presented as no sessions recorded.

## Product

- Summary reports recent median, reference difference, eligible days and evaluation status.
- Signals exposes exact-date value, recent median, personal reference, dated latest observation, non-interpolated points and guarded date comparison.
- Evidence exposes exact windows, central reference band, source/device, aggregation, rule and record IDs.
- Findings are related to every relevant system and deduplicated within each dossier. Shared signals do not become independent evidence or a score.
- Historical results are explicitly recalculated using currently available records bounded by the selected date. They are not claims about what the application knew then.
- Today is the browser's local calendar date, separate from the latest saved analysis. Body-to-Trends navigation preserves the metric and explored end date/window for the selected subject.
- Subject changes hide prior data synchronously and ignore late responses. Reads use ordered pagination.

## Scope and limits

These are descriptive product rules, not clinically validated thresholds or causal explanations. Baselines do not silently exclude reported context. Persistent episodes, atomic analysis publication, contextual associations and new data integrations remain later deliveries. The existing refresh runtime still owns persistence; new canonical detector/baseline outputs are version-labelled and older stored outputs are not silently reinterpreted by Body.

No changes to Vault, RLS, rapid-service or production data are needed for this release. MIGRATIONS_HEAD is aligned with the already committed migration 027; that bookkeeping change does not execute SQL.

## Validation

Behavior tests cover duplicate days/IDs, independent repeated values, nulls, units, source selection and transitions, overlapping intervals, historical bounds, missing dates, baseline sufficiency, shared findings, timeline bounds and pagination. Body, Trends and runtime values/references are checked against the same fixtures. Legacy file-content tests were updated for the new contract; a Vault test now distinguishes a function input parameter from a stored column. Misplaced root test imports were repaired so the full suite can run.
