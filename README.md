# Health OS v0.5 — pre-execution build

This package is deliberately usable in browser/demo mode before native Health Connect is wired.

## What exists
- React/Vite UI
- Capacitor-ready project
- Today / Evolución / Salud / Datos
- subjective one-tap check-in UI
- deterministic finding presentation
- data-quality concept
- provider-neutral connector contract
- Health Query API contract
- physiological-day logic + test
- Supabase client bootstrap
- Health Connect adapter placeholder

## Tonight: first execution
1. `npm install`
2. `npm run dev` — inspect browser UI first.
3. Copy `.env.example` to `.env` and add Supabase credentials when ready.
4. Apply DB migrations 001 + 002 from the earlier schema package.
5. `npm run test`
6. `npm run build`
7. Then add Android/Capacitor and the selected Health Connect native plugin.

Important: the Health Connect adapter intentionally returns unavailable until we select and install the native bridge. This prevents a fake integration from being mistaken for working ingestion.

## Next coding block
- Supabase authentication
- persistence of subjective report
- source_records ingestion service
- Health Connect permission matrix + native implementation
- normalization of first 5 record types


## v0.6 additions
Raw-first idempotent ingestion, sync engine, normalizer registry, subjective persistence, robust statistics and first deterministic HRV finding detector.


## v0.7 additions
- Supabase auth provider and auth screen
- demo/live mode
- subjective check-in persistence with local fallback
- deterministic Daily Brief builder
- reproducible analysis-context builder
- session state in Data screen


## v0.8 additions
- Today screen now reads a provider-neutral dashboard repository
- Supabase daily_features/findings integration with demo fallback
- real manual event persistence + event bottom sheet
- source freshness DB view
- UI no longer imports demo data directly


## v0.9 additions
Event Semantics Engine: event registry, temporal exposures, association storage, hypotheses, matched-context association primitive and epistemic guardrails.


## v1.0 additions
Aging/Longevity module: algorithm registry, aging assessments, drivers, strict PhenoAge implementation, DunedinPACE external-only contract, Health OS longitudinal-pace guardrail, coverage/eligibility engine and Aging UI.


## v1.1 additions
Seven longitudinal aging systems, system registry and assessments, normalized-trend engine, coverage/confidence rules, system UI and tests.


## v1.2 additions
System Evidence Engine: scientific evidence registry, measurement-method reliability registry, multiplicative effective weights, sample eligibility, correlation-family penalties, auditable metric contributions and Aging UI evidence panel.


## v1.3 additions
Risk & Reference Engine: piecewise/nonlinear references, robust personal-baseline normalization, age/sex percentile contract, contextual confidence penalties, trajectory contextualization, Evidence Engine adapter and audit tables.


## v1.4 additions
Experimental Health OS Pace framework: multi-system eligibility, evidence/confidence/coverage weighting, domain caps, shrinkage toward neutral, uncertainty envelope, contribution audit and non-causal scenario sensitivity.


## v1.5 additions
Personal Learning Loop: association evidence grading, outcome→system mapping, behavior/system impacts, opportunity ranking, Pace scenario bridge, and hard separation between personal associations and observed aging trajectory.


## v1.6 additions
N-of-1 Experiment Designer: candidate detection, safety classes, prospective protocol generation, seeded exposure/control schedules, predeclared outcomes, confounder/stopping rules, robust paired analysis and experiment UI.


## v1.7 additions
Decision Engine: transparent expected-benefit/information-gain scoring, evidence/actionability weighting, burden/safety penalties, diversity-aware ranking, data-gap decisions, experiment-vs-behavior deduplication and Priority Now UI.


## v1.8
Scientific Intelligence + Measurement Intelligence with evidence appraisal and a guarded model-update gate.


## v1.8.1 fixes (external review)
- `src/vite-env.d.ts` added: `import.meta.env` did not typecheck, so `npm run build` had never succeeded.
- `tests/robust.test.ts`: MAD expectation corrected (deviations of [70,72,74,76,1000] are [4,2,0,2,926] → median 2, not 4). The implementation was already correct.
- Migration `014_security_hardening.sql`: `source_freshness` recreated with `security_invoker = true` (it bypassed RLS); RLS enabled + read-only policy on all registry/knowledge tables (they were client-writable via the bundled anon key).


## v1.9 Runtime Foundation
Schema reconstruction (001–014), Health Connect native bridge contract + Android reader, five core normalizers, strict lab-unit conversion/plausibility gates, honest empty-live dashboard, and real sleep-anchored exposure resolution. See README_RUNTIME_V1.9.md.
