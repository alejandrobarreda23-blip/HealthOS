# HealthOS — Multiuser Integrations V1

## Canonical operating model

Passive integrations are operationally managed by HealthOS administrators.

```text
subject = owner of physiology
admin = configures passive source
credential = encrypted secret
sync = writes only into subject data owner
user = enters manual/contextual information
```

## Security invariants

1. API credentials never belong to the admin's physiological profile.
2. The browser sends a credential only during explicit configuration.
3. The credential is stored in Supabase Vault.
4. The plaintext credential is never returned by HealthOS after saving.
5. A normal user cannot configure another subject's passive source.
6. An admin may sync a selected subject but may not use that permission to write arbitrary manual physiological values.
7. Every configure/sync/disable operation is audited.
8. Raw-first ingestion and idempotent provider keys remain unchanged.

## Intervals.icu V1

The integration stores:
- subject_id
- athlete ID
- encrypted API-key reference
- optional historical start date
- configuration metadata
- last synchronization status

The rapid-service Edge Function accepts an optional `target_subject_id`.

When absent:
- legacy self-sync remains compatible with existing Edge Function environment secrets.

When present:
- caller must have admin scope for the subject;
- subject data owner is resolved from `subjects.created_by_user_id`;
- API credential is decrypted server-side only;
- raw and normalized rows are written using the subject data owner's `user_id`.
