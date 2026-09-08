import { supabase } from '../lib/supabase';
import {
  VISIBLE_AGING_PHOTO_PROTOCOL_V1,
  type VisibleAgingIntervention,
  type VisibleAgingObservation,
  type VisibleAgingPhotoSession,
  type VisibleAgingPose,
} from '../aging/visible-aging';

const BUCKET = 'visible-aging-private';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}

function mapPhotoSession(row: any): VisibleAgingPhotoSession {
  return {
    id: row.id,
    userId: row.user_id,
    capturedAt: row.captured_at,
    protocolVersion: row.protocol_version,
    protocolSnapshot: row.protocol_snapshot ?? {},
    status: row.status,
    frontPath: row.front_path,
    obliquePath: row.oblique_path,
    profilePath: row.profile_path,
    quality: row.quality ?? {},
    createdAt: row.created_at,
  };
}

function mapIntervention(row: any): VisibleAgingIntervention {
  return {
    id: row.id,
    userId: row.user_id,
    interventionType: row.intervention_type,
    label: row.label,
    startedOn: row.started_on,
    endedOn: row.ended_on ?? null,
    note: row.note ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function mapObservation(row: any): VisibleAgingObservation {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id ?? null,
    metricKey: row.metric_key,
    valueNumeric: row.value_numeric ?? null,
    valueText: row.value_text ?? null,
    unit: row.unit ?? null,
    dataLevel: row.data_level,
    methodVersion: row.method_version,
    confidence: row.confidence ?? null,
    observedAt: row.observed_at,
    metadata: row.metadata ?? {},
  };
}

function safeExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function listVisibleAgingPhotoSessions(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('visible_aging_photo_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('captured_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapPhotoSession);
}

export async function listVisibleAgingInterventions(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('visible_aging_interventions')
    .select('*')
    .eq('user_id', userId)
    .order('started_on', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapIntervention);
}

export async function listVisibleAgingObservations(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('visible_aging_observations')
    .select('*')
    .eq('user_id', userId)
    .order('observed_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapObservation);
}

export async function addVisibleAgingIntervention(params: {
  userId: string;
  interventionType: string;
  label: string;
  startedOn: string;
  note?: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('visible_aging_interventions')
    .insert({
      user_id: params.userId,
      intervention_type: params.interventionType,
      label: params.label.trim(),
      started_on: params.startedOn,
      note: params.note?.trim() || null,
      metadata: {
        acquisition_mode: 'reported_once',
        visible_aging_version: 'visible_aging_v1',
      },
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapIntervention(data);
}

export async function completeVisibleAgingPhotoCampaign(params: {
  userId: string;
  files: Record<VisibleAgingPose, File>;
  capturedAt?: string;
}) {
  const client = requireSupabase();
  const sessionId = crypto.randomUUID();
  const capturedAt = params.capturedAt ?? new Date().toISOString();
  const uploaded: string[] = [];

  const uploadPose = async (pose: VisibleAgingPose) => {
    const file = params.files[pose];
    const path = `${params.userId}/${sessionId}/${pose}.${safeExtension(file)}`;
    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      });

    if (error) throw error;
    uploaded.push(path);
    return path;
  };

  try {
    const frontPath = await uploadPose('front');
    const obliquePath = await uploadPose('oblique_45');
    const profilePath = await uploadPose('profile');

    const { data, error } = await client
      .from('visible_aging_photo_sessions')
      .insert({
        id: sessionId,
        user_id: params.userId,
        captured_at: capturedAt,
        protocol_version: VISIBLE_AGING_PHOTO_PROTOCOL_V1.version,
        protocol_snapshot: VISIBLE_AGING_PHOTO_PROTOCOL_V1,
        status: 'complete',
        front_path: frontPath,
        oblique_path: obliquePath,
        profile_path: profilePath,
        quality: {
          self_reported_protocol_completion: true,
          automatic_image_quality_check: 'not_implemented',
        },
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapPhotoSession(data);
  } catch (error) {
    if (uploaded.length) {
      try {
        await client.storage.from(BUCKET).remove(uploaded);
      } catch {
        // Best-effort cleanup only. The original error is more important.
      }
    }
    throw error;
  }
}

export async function getVisibleAgingSignedPhotoUrls(
  session: VisibleAgingPhotoSession,
  expiresInSeconds = 300,
) {
  const client = requireSupabase();
  const paths = [session.frontPath, session.obliquePath, session.profilePath];
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrls(paths, expiresInSeconds);

  if (error) throw error;
  return data.map((x) => x.signedUrl);
}
