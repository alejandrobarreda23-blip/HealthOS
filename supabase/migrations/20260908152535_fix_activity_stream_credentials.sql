-- Vault is intentionally not an exposed PostgREST schema. This server-only RPC
-- runs with service_role's existing privileges; it does not elevate privileges.
create function public.activity_stream_credential(target_subject_id uuid, target_athlete_id text)
returns text
language sql stable security invoker
set search_path = ''
as $$
  select v.decrypted_secret
  from public.subject_integrations i
  join public.subjects s on s.id=i.subject_id and s.status='active'
  join vault.decrypted_secrets v on v.id=i.credential_secret_id
  where i.subject_id=target_subject_id and i.provider='intervals_icu'
    and i.status='active' and i.external_account_id=target_athlete_id
  limit 1;
$$;
revoke all on function public.activity_stream_credential(uuid,text) from public,anon,authenticated;
grant execute on function public.activity_stream_credential(uuid,text) to service_role;
