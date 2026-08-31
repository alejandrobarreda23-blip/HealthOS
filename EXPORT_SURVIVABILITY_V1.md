# EXPORT / SURVIVABILITY V1

Status: SPEC + IMPLEMENTATION CANDIDATE  
Maturity: not merged, not CI-green, not real-data validated.

## 1. Purpose

HealthOS must remain intelligible and reconstructible even if the application,
Supabase project, connector, AI provider, or original maintainers disappear.

Export is therefore not a convenience feature. It is part of the data model.

The export has two distinct goals:

1. **Archive** — preserve the complete evidentiary record.
2. **Reconstruction** — allow a future implementation to rebuild normalized
   longitudinal state and understand how derived conclusions were produced.

A third goal, **human inspection**, is supported through CSV views but is not a
substitute for the canonical machine-readable archive.

## 2. Constitutional rules

### E1 — Raw is first-class
Every export MUST contain immutable `source_records` payloads and provenance.
A normalized-only export is incomplete.

### E2 — No secrets
API keys, access tokens, refresh tokens, Supabase secrets, authorization
headers, cookies, encryption keys and connector credentials MUST NOT appear.

### E3 — Missing remains missing
Null/absent values MUST NOT become zero, normal, false, or interpolated.

### E4 — Derived data identifies its algorithm
Features, baselines, findings, briefs and other derived entities MUST preserve
their version fields and, where available, `analysis_run_id`.

### E5 — Integrity is independently checkable
Every payload file MUST have SHA-256 and byte size recorded in `manifest.json`.

### E6 — Export format is versioned
`export_format_version` is independent from app, DB and algorithm versions.

### E7 — Portable core, optional convenience views
NDJSON/JSON is canonical. CSV is a convenience representation for flat tables.

### E8 — Database-specific reconstruction is not the archive contract
A SQL dump may be supplied as an optional recovery aid, but survivability does
not depend on PostgreSQL/Supabase remaining available.

### E9 — Original and derived jurisdictions remain distinguishable
The archive MUST preserve `data_level`, source provenance and algorithm/version
metadata so measured/reported/derived/inferred information cannot collapse
into one undifferentiated history.

### E10 — An export is immutable
A completed export receives an `export_id` and manifest hash. A later export is
a new artifact, never an in-place mutation.

## 3. Package layout

```text
healthos-export-<timestamp>/
  manifest.json
  README.txt

  raw/
    source_records.ndjson

  normalized/
    observations.ndjson
    measurement_groups.ndjson
    sleep_sessions.ndjson
    sleep_stages.ndjson
    exercise_sessions.ndjson
    series.ndjson
    series_points.ndjson
    medical_documents.ndjson
    medical_results.ndjson

  context/
    events.ndjson
    subjective_reports.ndjson

  analysis/
    daily_features.ndjson
    metric_baselines.ndjson
    findings.ndjson
    health_briefs.ndjson
    analysis_runs.ndjson
    analysis_run_stages.ndjson
    analysis_publications.ndjson

  governance/
    metric_registry.json
    source_priority_registry.json
    system_components.ndjson
    validation_evidence.ndjson
    maturity_transitions.ndjson

  csv/
    observations.csv
    exercise_sessions.csv
    events.csv
    daily_features.csv
    metric_baselines.csv
    findings.csv
```

A table that does not yet exist in the installed schema is recorded in the
manifest as `not_available`, not fabricated as an empty successful export.

## 4. Manifest

Minimum shape:

```json
{
  "export_format": "healthos-portable-archive",
  "export_format_version": "1.0.0",
  "export_id": "uuid",
  "created_at": "ISO-8601 UTC",
  "scope": {
    "kind": "full",
    "user_id": "uuid",
    "from": null,
    "to": null
  },
  "source_system": {
    "app_version": "unknown-or-version",
    "schema_migrations": ["001", "002", "..."],
    "metric_dictionary_version": "v1",
    "feature_registry_version": "v2"
  },
  "files": [
    {
      "path": "raw/source_records.ndjson",
      "media_type": "application/x-ndjson",
      "record_count": 523,
      "bytes": 123456,
      "sha256": "..."
    }
  ],
  "omissions": [],
  "redactions": [],
  "manifest_sha256": "..."
}
```

`manifest_sha256` is computed from a canonical manifest representation with
the `manifest_sha256` field omitted.

## 5. Canonical serialization

For integrity hashing:

- UTF-8
- LF line endings
- JSON object keys sorted recursively
- timestamps serialized exactly as exported
- one JSON object per NDJSON line
- newline at EOF
- no pretty-printing in NDJSON
- no locale-dependent number formatting

Rows SHOULD be deterministically ordered by stable primary key. Where temporal
inspection matters, the export may additionally provide a temporal CSV view;
hash identity remains attached to the canonical NDJSON file.

## 6. Raw payload handling

`source_records.ndjson` includes the stored original provider payload plus:

- source record ID
- provider
- record type
- external ID
- source schema version
- source update time
- payload hash
- ingestion metadata

The exporter MUST NOT call the remote provider to recreate raw data. It exports
what HealthOS actually stored.

This matters because the current Intervals ingestion already stores provider
payloads before normalization; survivability preserves that boundary.

## 7. Redaction policy

The exporter uses an explicit denylist and schema-aware projection.

Never export:

```text
INTERVALS_API_KEY
SUPABASE_SERVICE_ROLE_KEY
access_token
refresh_token
authorization
cookie
password
secret
private_key
```

Do not recursively delete arbitrary fields merely because their name contains
`key`; physiological/provider payloads may legitimately use that word.
Redaction rules MUST be tested and versioned.

If a stored raw provider payload unexpectedly contains a credential-shaped
field, the archive records a redaction entry:

```json
{
  "file": "raw/source_records.ndjson",
  "record_id": "...",
  "json_path": "$.payload.access_token",
  "rule": "credential-denylist-v1"
}
```

The secret value itself is never written to the archive or log.

## 8. Medical documents

V1 exports metadata and extracted structured results.

Binary originals are a separate optional bundle:

```text
documents/
  <sha256>.<ext>
```

If binaries are included:
- filename is content-addressed;
- manifest records SHA-256;
- metadata links document row → binary path;
- absence of a binary is explicit.

This avoids pretending that database metadata alone preserves the original
clinical evidence.

## 9. Referential integrity checks

Before completion, validate at minimum:

- observations.source_record_id → source_records.id when non-null
- exercise_sessions.source_record_id → source_records.id when non-null
- medical_results.medical_document_id → medical_documents.id
- metric keys referenced by normalized/derived rows exist in exported registry
- analysis_run_id references resolve when the corresponding runtime schema exists
- evidence IDs used by maturity transitions resolve

A failed integrity check means export status `failed`; no completed manifest is
published.

## 10. Export run lifecycle

```text
requested
  ↓
snapshotting
  ↓
serializing
  ↓
integrity_check
  ↓
hashing
  ↓
completed
```

Failure at any point:

```text
failed
```

A completed artifact is published only after all required files, integrity
checks and hashes succeed.

## 11. Snapshot consistency

A full export should represent one logical database snapshot.

Implementation options, in preference order:

1. server-side transaction/snapshot;
2. server-side export RPC with consistent cutoff;
3. explicit `snapshot_cutoff` plus table-level consistency checks.

A browser iterating tables independently is NOT the authoritative full-export
implementation because writes can occur between reads.

## 12. Privacy and storage

The archive is highly sensitive health data.

V1 rules:
- generated server-side or in a trusted local context;
- never public;
- temporary server artifacts have explicit expiry;
- application logs contain IDs/status, not physiological payloads;
- encryption-at-rest is delegated to the chosen storage layer;
- encrypted portable bundle can be added separately without changing the
  canonical internal archive format.

## 13. Restore contract

V1 does not promise one-click restore. It promises enough information for a
future importer to:

1. validate hashes;
2. inspect schema/version metadata;
3. restore raw source records;
4. restore normalized observations/sessions/events;
5. restore derived state with algorithm versions;
6. optionally discard derived state and re-derive it from preserved raw +
   normalization rules.

The preferred future restore strategy is:

```text
raw preserved
   ↓
normalizers by recorded version
   ↓
normalized reconstruction
   ↓
analysis pipeline by version
```

Stored normalized and derived outputs act as both history and verification
targets.

## 14. Export profiles

### FULL_ARCHIVE
Everything available for the user. Canonical survivability artifact.

### RAW_PLUS_NORMALIZED
Raw + normalized + context, without analysis/governance convenience layers.

### ANALYSIS_AUDIT
Analysis runs, features, baselines, findings, briefs and evidence ledger.

### HUMAN_FLAT
CSV convenience package. Never advertised as sufficient backup.

## 15. CI contract

CI MUST test:

1. deterministic canonical JSON;
2. identical input → identical file hashes;
3. changed row → changed affected file hash;
4. denylisted credentials never serialize;
5. null remains null;
6. required archive sections are declared;
7. unknown table is `not_available`, not silently omitted;
8. referential integrity validator rejects broken references;
9. manifest hash verifies;
10. exporter does not depend on an LLM.

## 16. Relationship with AI

No LLM is needed to produce, validate, hash or restore the archive.

An AI may later explain an export to a human, but the portable record must be
fully interpretable without access to OpenAI, Anthropic or any other model.

## 17. Maturity

Current status:

```text
SPEC                     ✓
IMPLEMENTATION CANDIDATE ✓
MERGED                   ✗
CI-GREEN                 ✗
REAL-DATA EXECUTED       ✗
RESTORE-TESTED           ✗
```

A survivability implementation should not be considered VALIDATED until a
fresh environment has successfully verified and reconstructed a real export.

## 18. V1.2 format decisions

### Hash algorithm
Every manifest MUST declare:

```json
"hash_algorithm": "sha256"
```

The identifier is part of the archive contract and MUST be rejected by a
verifier that does not implement it.

### Canonicalization identifier
V1 adopts:

```json
"canonicalization": "healthos-canonical-json-v1-ecmascript"
```

This deliberately does **not** claim RFC 8785 compatibility. Its semantics are:

- JSON primitives, arrays and plain objects only;
- object keys recursively sorted using ECMAScript string ordering;
- ECMAScript `JSON.stringify` string/number serialization;
- finite numbers only;
- negative zero rejected;
- undefined, bigint, symbol, function and non-plain objects rejected;
- no whitespace.

The archive ships with `verify.mjs`, which is the executable reference
verifier for this canonicalization version. A future V2 may adopt RFC 8785,
but doing so requires a new canonicalization identifier.

### Archive carries its own verifier
Every completed FULL_ARCHIVE MUST contain at root:

```text
verify.mjs
```

with no third-party dependencies. The manifest records the verifier path and
minimum Node major version. `verify.mjs` validates:

- manifest self-hash;
- declared hash/canonicalization identifiers;
- each exported file's byte count;
- each exported file's SHA-256;
- NDJSON `record_count`.

This is independent of the application that created the archive.

### Integrity gate scope
`integrity_check` for FULL_ARCHIVE is not satisfied by checking only
observations/source_records. It MUST cover all exported foreign-key
relationships known to the installed schema, duplicate primary IDs, metric
registry references and analysis/evidence links.

The manifest/file verifier and dataset referential validator are separate
checks:
- verifier: bytes, hashes, record counts, manifest;
- integrity validator: semantic/referential consistency.

Both must pass before `completed`.

### Migration-chain drift
Repository migration head is a build contract. `MIGRATIONS_HEAD` records the
expected repo head, and CI compares it against the migration directory.
When production migration head is available to CI, it MUST also match the repo
contract or the build fails.

The candidate 020–023 files supplied in `reconciliation/` are evidence for
audit only; they are not proof of production state.

