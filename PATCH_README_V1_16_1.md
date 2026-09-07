# HealthOS v1.16.1 — Integrated Product Drop

This patch is built **on top of HealthOS 1.11.5 + Multiuser V1**.

It deliberately preserves the multiuser runtime already merged into GitHub:
- `SubjectProvider` / `SubjectScope`
- admin `Usuarios`
- subject switching
- read-only admin views for non-self subjects
- subject-aware Today, Trends, Health Brief, Dashboard and Acquisition
- `admin_access_log`

The Multiuser V1.2 SQL supplied separately by the project is assumed to be **already applied** and must **not** be re-run for this drop.

## What this drop integrates

### Desktop product shell
- real desktop workspace instead of a narrow phone column
- persistent sidebar on desktop
- mobile bottom navigation preserved
- wide Trends layout and larger real-data charts

### Measurement Campaigns V1 (runtime)
- manual body-weight observation
- versioned home blood-pressure campaigns
- systolic + diastolic grouped as one measurement act
- protocol completeness tracking
- no clinical interpretation from campaign completion
- admin subject views remain read-only

### Body Overview / Mapa sistémico V1
- new default `Mapa` surface
- subject-aware because it consumes the already multiuser-aware Health Brief and Acquisition hooks
- programmable SVG body canvas, not a pasted mockup image
- measured / derived / reported / inferred visual grammar
- stillness when recent physiology is unavailable
- fog for missingness / source discontinuity
- one warm accent reserved for active findings
- desktop + mobile layouts

### Research/specification preserved for later runtime
The following are integrated as specifications only under `docs/future/`:
- Information Gain Engine V1
- Perturbation Model V1
- Recovery Kinetics V1
- Dynamic Response Engine V1
- Dynamic Response Validation Plan V1
- Adaptive Capacity V1
- Matched Event Engine V1
- Confounding Model V1
- Prospective Validation V1

They are **not activated** in production yet.

## Supabase

One new numbered migration is included:

`025_measurement_campaigns_v1.sql`

It is adapted to Multiuser V1:
- owners can write only their own campaigns;
- admins can read campaigns;
- admins do not gain write access to another subject's campaigns.

Run migration 025 once after uploading the patch.

No other Supabase query from this drop should be run.

## Version

`1.16.1`
