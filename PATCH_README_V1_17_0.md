# HealthOS v1.17.0 — Visual / Product Refinement Drop

Built on the user-provided current repository `HealthOS-main (7).zip`.

## Scope

### Body / Mapa sistémico V2
- More organic native SVG body.
- Clickable system nodes and cards.
- Selected-system dossier.
- Real-data motion gating preserved.
- Fog still means missing observability.
- Warm finding beacon remains semantically reserved.
- No pasted mockup or fake physiological values.

### Evolución V2
- Stored personal baseline band + median when sufficient.
- Real gaps remain gaps.
- Hover cursor with date/value/reference/deviation.
- Real exercise-session markers as context, explicitly non-causal.
- Window-based x-axis, so long missing tails remain visually visible.
- More desktop-like analytical rail.

### Aging V2
- Replaces the old demo-driven production UI.
- No hard-coded chronological age, demo Pace, demo drivers, or demo scientific scores in the visible screen.
- Shows system observability and model maturity from real Health Brief availability.
- Pace remains unpublished until an actual validated runtime exists.
- PhenoAge remains unavailable until structured labs are present.

## Database / Supabase
No new migration.
No Edge Function change.
No change to Multiuser Integrations, Vault, RLS or rapid-service.

## Files changed
- src/components/BodyMap.tsx
- src/screens/Body.tsx
- src/screens/Trends.tsx
- src/screens/Aging.tsx
- src/repositories/trends.ts
- src/app/styles.css
- tests/visual-product-contract-v1.test.ts
- package.json
- package-lock.json

## Validation
Run:

```bash
npm test
npm run build
```
