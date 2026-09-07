import { supabase } from '../lib/supabase';

export type SubjectIntegration = {
  integrationId: string;
  subjectId: string;
  provider: string;
  status: 'active' | 'disabled' | 'error';
  externalAccountId: string | null;
  historyOldest: string | null;
  configuredAt: string;
  configuredByUserId: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: 'ok' | 'failed' | null;
  lastSyncError: string | null;
  metadata: Record<string, unknown>;
};

function mapRow(row: any): SubjectIntegration {
  return {
    integrationId: row.integration_id,
    subjectId: row.subject_id,
    provider: row.provider,
    status: row.status,
    externalAccountId: row.external_account_id ?? null,
    historyOldest: row.history_oldest ?? null,
    configuredAt: row.configured_at,
    configuredByUserId: row.configured_by_user_id ?? null,
    lastSyncAt: row.last_sync_at ?? null,
    lastSyncStatus: row.last_sync_status ?? null,
    lastSyncError: row.last_sync_error ?? null,
    metadata: row.metadata ?? {},
  };
}

export async function listSubjectIntegrations(subjectId: string) {
  if (!supabase) throw new Error('Supabase no está configurado.');

  const { data, error } = await supabase.rpc(
    'list_subject_integrations',
    { target_subject_id: subjectId },
  );

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function configureIntervalsForSubject(params: {
  subjectId: string;
  athleteId: string;
  apiKey: string;
  oldest?: string | null;
}) {
  if (!supabase) throw new Error('Supabase no está configurado.');

  const { data, error } = await supabase.rpc(
    'admin_upsert_intervals_integration',
    {
      target_subject_id: params.subjectId,
      athlete_id: params.athleteId,
      api_key: params.apiKey,
      oldest: params.oldest || null,
    },
  );

  if (error) throw error;
  return data as string;
}

export async function disableSubjectIntegration(
  subjectId: string,
  provider: string,
) {
  if (!supabase) throw new Error('Supabase no está configurado.');

  const { error } = await supabase.rpc(
    'admin_disable_subject_integration',
    {
      target_subject_id: subjectId,
      target_provider: provider,
    },
  );

  if (error) throw error;
}
