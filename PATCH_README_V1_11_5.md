# HealthOS v1.11.5 — Visual Polish Drop

Presentation-only drop built on the reconciled v1.11 runtime plus the v1.11.1 test-fixture hotfix.

## Changed

- `src/app/styles.css` — design tokens and unified visual system; Today, Trends, Acquisition, Data and navigation polish.
- `src/screens/Trends.tsx` — refined chart rendering with subtle grid, latest point, loading/empty states and clearer date context. Gaps are still preserved; no interpolation was added.
- `src/components/MetricCard.tsx` — consistent KPI structure and explicit missing-state styling.
- `package.json` — version `1.11.5`.
- `VISUAL_SYSTEM_V1.md` — lightweight visual constitution for future screens.

## Not changed

- No Supabase migration.
- No metric contract changes.
- No finding/baseline logic changes.
- No acquisition ranking changes.
- No API or schema changes.

## Validation

Run:

```bash
npm test
npm run build
```

Visual smoke test:

1. Today — 0% coverage and missing metrics remain epistemically clear.
2. Trends — real gaps remain gaps; latest date and measured-day count are visible.
3. Data — source continuity and independent gaps remain functionally unchanged.
4. Bottom navigation — active state remains readable on small screens.
