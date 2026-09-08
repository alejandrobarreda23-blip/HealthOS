import { supabase } from '../lib/supabase';
import { readAllPages } from './pagination';

export interface TrainingSession {
  id: string; physiological_date: string; activity_type: string; started_at: string; ended_at: string;
  provider: string; source_device: string | null; source_record_id: string | null; external_session_id: string | null;
  distance_m: number | null; elevation_gain_m: number | null; active_energy_kcal: number | null;
  avg_heart_rate_bpm: number | null; max_heart_rate_bpm: number | null;
}
export async function getActivities(userId: string): Promise<TrainingSession[]> {
  if (!supabase) return [];
  const client = supabase;
  return await readAllPages((from, to) => client.from('exercise_sessions')
    .select('id,physiological_date,activity_type,started_at,ended_at,provider,source_device,source_record_id,external_session_id,distance_m,elevation_gain_m,active_energy_kcal,avg_heart_rate_bpm,max_heart_rate_bpm')
    .eq('user_id', userId).order('started_at', { ascending: false }).order('id').range(from, to)) as TrainingSession[];
}
export async function getActivitySource(userId: string, session: TrainingSession): Promise<Record<string, unknown> | null> {
  if (!supabase || !session.source_record_id) return null;
  const { data, error } = await supabase.from('source_records').select('payload,external_id,provider')
    .eq('user_id', userId).eq('id', session.source_record_id).eq('record_type', 'activity').maybeSingle();
  if (error) throw error;
  if (!data || data.provider !== session.provider || data.external_id !== session.external_session_id) return null;
  return data.payload && typeof data.payload === 'object' ? data.payload as Record<string, unknown> : null;
}
