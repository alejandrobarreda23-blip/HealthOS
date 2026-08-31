# HealthOS Visual System V1 — v1.11.5

## Intent

This drop deliberately changes presentation, not physiological logic. HealthOS should feel like a calm personal instrument: precise, restrained, longitudinal and professionally credible.

## Principles

1. **Quiet hierarchy** — data first, explanation second, action third.
2. **Missing remains visible** — no decorative treatment may imply that missing data are normal or zero.
3. **Uncertainty is calm** — warnings use restrained visual emphasis; urgency is never invented by color.
4. **One visual grammar** — cards, badges, sources, findings and acquisition opportunities use a shared spacing/radius/type system.
5. **Charts are instruments** — sparse grid, rounded strokes, explicit gaps, latest-point emphasis, no fake smoothing or interpolation.
6. **Premium by restraint** — whitespace and typography carry more hierarchy than decoration.

## Tokens

The CSS layer defines `--hos-*` tokens for surface, ink, borders, accent, warm/alert states, radii and shadows. Future screens should reuse these tokens instead of introducing one-off colors.

## Current scope

- Today KPI cards, coverage hero, findings and uncertainty.
- Trends controls and line chart presentation.
- Acquisition/source-continuity cards.
- Data sources and sync surfaces.
- Bottom navigation.

## Explicitly deferred

- Full brand identity/logo work.
- Dark mode.
- Motion system beyond basic transitions/loading state.
- Complex charting library.
- Desktop/tablet information architecture.
- Illustration system.
