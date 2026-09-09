import { supabase } from '../lib/supabase';
import { readAllPages } from './pagination';
import { minusDays } from '../health/metrics/daily-series';
import { WEEKLY_VERSION, type WeeklyInput, type WeeklyLearning, type WeeklyQuestion } from '../health/weekly-learning';
import { parseQuestionMemory, weeklyAssociationRows } from '../health/weekly-memory';

function dateInZone(instant: string | null, zone: string | null): string | null {
  if (!instant || !zone) return null;
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant)); } catch { return null; }
}
export async function getWeeklyContext(userId: string, end: string) {
  const client = supabase;
  if (!client) throw new Error('No hay conexión de datos disponible.');
  const start = minusDays(end, 484);
  const [sleeps, events, checkIns] = await Promise.all([
    readAllPages((from, to) => client.from('sleep_sessions').select('id,physiological_date,started_at,ended_at,timezone,provider,source_device,normalizer_version')
      .eq('user_id', userId).gte('physiological_date', start).lte('physiological_date', end).order('physiological_date').order('id').range(from, to)),
    readAllPages((from, to) => client.from('events').select('id,physiological_date,event_type,ended_at,timezone,note').eq('user_id', userId)
      .gte('physiological_date', start).lte('physiological_date', end).order('physiological_date').order('id').range(from, to)),
    readAllPages((from, to) => client.from('subjective_reports').select('physiological_date,stress_score,energy_score,fatigue_score').eq('user_id', userId)
      .gte('physiological_date', start).lte('physiological_date', end).order('physiological_date').range(from, to)),
  ]);
  return {
    sleeps: sleeps.map(s => ({ id: s.id, date: s.physiological_date, start: s.started_at, end: s.ended_at, timezone: s.timezone, provider: s.provider, device: s.source_device, version: s.normalizer_version })),
    events: events.map(e => ({ id: e.id, date: e.physiological_date, type: e.event_type, endDate: dateInZone(e.ended_at, e.timezone), note: e.note })),
    checkIns: checkIns.map(c => ({ id: c.physiological_date, date: c.physiological_date, stress: c.stress_score, energy: c.energy_score, fatigue: c.fatigue_score })),
  } as Omit<WeeklyInput, 'points'>;
}
export async function getWeeklyMemory(userId: string) {
  if (!supabase) throw new Error('No se pudo acceder a la memoria.');
  const client = supabase;
  const [rows, following] = await Promise.all([
    readAllPages((from, to) => client.from('associations').select('id,created_at,evidence').eq('user_id', userId).eq('analysis_version', WEEKLY_VERSION)
      .order('created_at').order('id').range(from, to)),
    client.from('hypotheses').select('hypothesis_key,status').eq('user_id', userId).eq('hypothesis_version', WEEKLY_VERSION),
  ]);
  if (following.error) throw following.error;
  return { memories: rows.map(parseQuestionMemory).filter((m): m is NonNullable<typeof m> => m !== null),
    following: (following.data ?? []).filter(h => h.status === 'testing').map(h => h.hypothesis_key.replace('weekly:', '')) };
}
async function ownerClient(userId: string) {
  if (!supabase) throw new Error('No hay sesión disponible.');
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error('Solo puedes guardar revisiones y contexto en tu propio perfil.');
  return supabase;
}
export async function saveWeeklyReview(userId: string, report: WeeklyLearning) {
  const client = await ownerClient(userId);
  const rows = await weeklyAssociationRows(userId, report);
  const { error } = await client.from('associations').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}
export async function followWeeklyQuestion(userId: string, question: WeeklyQuestion, following: boolean) {
  const client = await ownerClient(userId);
  const { error } = await client.from('hypotheses').upsert({ user_id: userId, hypothesis_key: `weekly:${question.id}`, title: question.title,
    statement: 'Pregunta exploratoria en seguimiento. No equivale a una relación causal confirmada.', exposure_key: question.x, outcome_key: question.y,
    status: following ? 'testing' : 'retired', hypothesis_version: WEEKLY_VERSION, confidence: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id,hypothesis_key' });
  if (error) throw error;
}
