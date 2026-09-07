# HealthOS v1.18.0a — Body history TypeScript hotfix

Fixes Netlify/TypeScript errors TS2345 in `src/repositories/body-history.ts`.

Cause: the nullish fallback object for a metric bucket contained empty arrays
without contextual annotation, so TypeScript inferred `never[]` for `values`,
`evidence`, and `providers`.

Fix: explicitly type the bucket as:

- `values: number[]`
- `unit: string | null`
- `evidence: BodyEvidenceKind[]`
- `providers: string[]`

No Supabase, SQL, Edge Function, RLS, or runtime behavior changes.

Upload this ZIP at repository root and replace the existing
`src/repositories/body-history.ts`.
