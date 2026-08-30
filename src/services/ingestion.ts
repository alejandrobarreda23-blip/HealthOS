import { supabase } from '../lib/supabase';
import type { RawSourceRecord } from '../connectors/connector';

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2,'0')).join('');
}

/**
 * Raw-first ingestion. No normalized row is written until the provider-native
 * record has been persisted successfully.
 */
export async function persistRawRecords(userId:string, records:RawSourceRecord[]) {
  if (!supabase) throw new Error('Supabase is not configured');
  const rows = await Promise.all(records.map(async r => ({
    user_id:userId,
    provider:r.provider,
    source_type:r.sourceType,
    record_type:r.recordType,
    external_id:r.externalId,
    source_schema_version:r.sourceSchemaVersion ?? null,
    source_updated_at:r.sourceUpdatedAt ?? null,
    payload:r.payload,
    payload_hash:await sha256(r.payload)
  })));

  const {data,error}=await supabase.from('source_records')
    .upsert(rows,{onConflict:'user_id,provider,record_type,external_id'})
    .select();

  if(error) throw error;
  return data;
}
