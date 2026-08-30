-- v1.8.1 Security hardening
--
-- Problem 1: source_freshness was a definer-rights view. In Supabase, a view
-- owned by postgres bypasses RLS on the underlying table, so ANY authenticated
-- client could read every user's provider list and record counts.
create or replace view public.source_freshness
with (security_invoker = true) as
select
  user_id,
  provider,
  max(received_at) as last_received_at,
  count(*) as raw_record_count
from public.source_records
group by user_id, provider;

-- Problem 2: global registry/knowledge tables shipped with RLS disabled.
-- Supabase grants table access to anon/authenticated by default, so
-- RLS-disabled tables are readable AND WRITABLE with the anon key that is
-- bundled inside the app. Anyone could rewrite reference ranges, evidence
-- weights or inject fake scientific sources.
--
-- Posture: RLS on, SELECT for authenticated users only, no client writes.
-- Seeding/curation happens via migrations or the service role (which
-- bypasses RLS). The client never writes to any of these tables today
-- (verified against src/), so nothing breaks.

do $$
declare t text;
begin
  foreach t in array array[
    'event_registry',
    'aging_algorithm_registry',
    'aging_system_registry',
    'metric_evidence_registry',
    'measurement_method_registry',
    'metric_reference_registry',
    'pace_model_registry',
    'outcome_system_map',
    'scientific_sources',
    'scientific_claims',
    'evidence_appraisals',
    'model_change_proposals',
    'measurement_candidates'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "read only registry" on public.%I', t);
    execute format(
      'create policy "read only registry" on public.%I for select to authenticated using (true)',
      t
    );
  end loop;
end $$;
