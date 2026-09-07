# HealthOS v1.18.0 — Body V3 / Organism Workspace

A focused Body-only product drop built on the live v1.17 visual refinement.

## What changes

- Body becomes the dominant physiological workspace instead of an anatomical sketch.
- New organic SVG figure with six selectable systemic channels.
- Local fog for missingness rather than globally fading the whole body.
- System cards expose coverage, signal state and active finding beacons.
- Right inspector unifies selected system, evidence provenance, current findings and continuity.
- New 365-day physiological scrubber built from normalized `observations` + `exercise_sessions`.
- Gaps stay visually empty.
- Historical dates show exact-day observations; current findings are never projected backwards.
- Movement is possible only when the exact selected date contains evidence normalized as `measured`.
- Data-quality findings never become anatomical amber beacons.

## No Supabase changes

This patch adds no migration and does not change:
- multiuser scope
- RLS
- Vault
- Intervals.icu
- rapid-service

It consumes the multiuser read scope already active in the current project.

## Main files

- `src/screens/Body.tsx`
- `src/components/body/BodyFigure.tsx`
- `src/components/body/BodySystemCard.tsx`
- `src/components/body/BodyTimeline.tsx`
- `src/body/view-state.ts`
- `src/repositories/body-history.ts`
- `src/hooks/useBodyHistory.ts`
- `src/app/styles.css`

## Deployment

Upload the patch contents to the repository, replacing matching files. No SQL and no Edge Function deployment are required.
