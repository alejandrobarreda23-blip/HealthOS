# HealthOS v1.19.0 — Body V4 / Organism Explorer

This is a focused Body rewrite built on the live Body V3 architecture.

## Main changes

- Body becomes a functional organism explorer rather than six permanent cards around a figure.
- Compact system labels are visually anchored to the organism.
- Three real visual modes: State / Coverage / Provenance.
- Single contextual dossier with Summary / Signals / Evidence tabs.
- Signal rows expose the metrics feeding the selected system.
- "Ver evolución completa" opens Trends on the relevant metric.
- Timeline now supports 30d / 90d / 1y.
- Timeline separates coverage, training events, gaps and comparison marker.
- A historical date can be pinned and compared descriptively against another date.
- BodyFigure V4 increases organism presence while preserving the visual grammar.
- The v1.18.0a `never[]` TypeScript fix for body-history is included.

## No Supabase work

There are NO migrations, SQL queries, RLS changes, Vault changes or Edge Function changes in this drop.

## Installation

Upload the contents of this ZIP at repository root and replace matching files.

Netlify remains the final compile/build gate.
