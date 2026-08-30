-- v1.8 Scientific Intelligence
create table if not exists public.scientific_sources(
 id uuid primary key default gen_random_uuid(), title text not null, doi text, pmid text,
 publication_date date, design text not null, state text not null default 'new',
 provenance jsonb not null default '{}'::jsonb, source_fingerprint text not null unique,
 created_at timestamptz not null default now());
create table if not exists public.scientific_claims(
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.scientific_sources(id) on delete cascade,
 domain text not null, claim_key text not null, claim_text text not null, population jsonb not null default '{}'::jsonb,
 outcomes jsonb not null default '{}'::jsonb, effect_estimate jsonb not null default '{}'::jsonb,
 limitations jsonb not null default '[]'::jsonb, source_span jsonb not null default '{}'::jsonb,
 extraction_version text not null, unique(source_id,claim_key,extraction_version));
create table if not exists public.evidence_appraisals(
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.scientific_sources(id) on delete cascade,
 internal_validity float8 not null, directness float8 not null, precision_score float8 not null,
 consistency float8 not null, applicability float8 not null, outcome_importance float8 not null,
 appraisal_score float8 not null, certainty text not null, notes jsonb not null default '[]'::jsonb,
 appraisal_version text not null, created_at timestamptz not null default now());
create table if not exists public.model_change_proposals(
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.scientific_sources(id) on delete cascade,
 change_kind text not null, target_key text not null, proposed_patch jsonb not null default '{}'::jsonb,
 rationale jsonb not null default '{}'::jsonb, corroborating_source_ids uuid[] not null default '{}',
 contradiction_source_ids uuid[] not null default '{}', gate_score float8 not null,
 status text not null default 'candidate', requires_human_review boolean not null default true,
 proposal_version text not null, created_at timestamptz not null default now());
create table if not exists public.measurement_candidates(
 id uuid primary key default gen_random_uuid(), measurement_key text not null, domain text not null,
 source_id uuid references public.scientific_sources(id), target_uncertainty text not null,
 invasiveness float8 not null, burden float8 not null, radiation boolean not null default false,
 evidence_maturity float8 not null, clinical_utility_established boolean not null default false,
 expected_information_gain float8 not null, caveats jsonb not null default '[]'::jsonb, version text not null);
