# Health OS v0.6

## Pipeline now encoded

Connector
→ Sync Engine
→ `source_records` (raw-first, idempotent upsert)
→ Normalizer Registry
→ normalized entities
→ canonical reconciliation
→ physiological day
→ robust feature engine
→ deterministic findings
→ analysis context
→ optional LLM

## Important failure boundary

Ingestion and normalization are deliberately separate jobs.

If normalization v3 fails, the source payload is already safe. It can be replayed without contacting the vendor again.

## First implemented deterministic primitives
- median
- MAD
- robust z-score
- coverage
- sustained HRV-drop detector

No medical conclusion is generated from these primitives.
