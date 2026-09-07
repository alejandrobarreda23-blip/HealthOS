# HealthOS v1.16.2 — Admin-managed integrations

This patch implements the agreed operating model:

- admin connects passive sources for each subject;
- subject remains the physiological owner;
- user/manual data entry remains separate;
- credentials are encrypted in Supabase Vault;
- admin can configure, sync, reconfigure and disable Intervals.icu;
- API key is never displayed after save;
- audit log records configure/sync/disable;
- raw-first and idempotent Intervals ingestion are preserved.

## IMPORTANT: two Supabase steps

### 1. SQL
Run these **once, in order**:

1. `supabase/migrations/026_admin_integrations_v1.sql`
2. `supabase/migrations/027_admin_daily_features_v1.sql`

Do not rerun the previous Multiuser V1.2 SQL.

### 2. Edge Function
The live `rapid-service` must be replaced/deployed with:

`supabase/functions/rapid-service/index.ts`

This is necessary because the old live function only reads one global
`INTERVALS_API_KEY` / `INTERVALS_ATHLETE_ID` and writes to the authenticated user's id.

The new version:
- preserves that self-sync path for backwards compatibility;
- accepts `target_subject_id` for admin sync;
- retrieves the subject credential server-side from Vault;
- writes raw/observations/exercise sessions to the subject data owner.

## UI test

As admin:
1. Usuarios → Jaume.
2. Datos.
3. The new "Gestión administrativa" integration panel should appear.
4. Enter Jaume's Athlete ID + API key.
5. Save.
6. API key field clears and cannot be read back.
7. Click "Sincronizar ahora".
8. Jaume's HealthOS should populate; your own data should remain untouched.

Never paste Jaume's API key into chat or repository files.
