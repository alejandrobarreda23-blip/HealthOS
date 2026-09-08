import type { TrainingSession } from '../repositories/activities';
import { nonnegative } from './activities';

export type ActivityColorMode = 'intensity' | 'rpe';
export interface ActivitySummary {
  name: string | null; intensity: number | null; rpe: number | null; hasRouteReference: boolean;
}
export interface SummaryRecord { id: string; provider: string; external_id: string | null; name: unknown; intensity: unknown; rpe: unknown; route_id: unknown }
export function activitySummary(row: SummaryRecord): ActivitySummary {
  const intensity = nonnegative(row.intensity), rpe = nonnegative(row.rpe);
  return { name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : null,
    intensity,
    rpe: rpe !== null && rpe >= 1 && rpe <= 10 ? rpe : null,
    hasRouteReference: (typeof row.route_id === 'number' && Number.isFinite(row.route_id) && row.route_id > 0) || (typeof row.route_id === 'string' && row.route_id.trim().length > 0) };
}
export function attachActivitySummaries(sessions: TrainingSession[], summaries: SummaryRecord[]): TrainingSession[] {
  const byId = new Map(summaries.map(r => [r.id,r]));
  return sessions.map(s => {
    const row = s.source_record_id ? byId.get(s.source_record_id) : undefined;
    return row && row.provider === 'intervals_icu' && row.provider === s.provider && row.external_id === s.external_session_id
      ? { ...s, summary: activitySummary(row) } : s;
  });
}
export function activityColor(session: TrainingSession, mode: ActivityColorMode) {
  const value = mode === 'intensity' ? session.summary?.intensity : session.summary?.rpe;
  if (value === null || value === undefined) return { value: null, color: '#8b9692', background: '#f1f3f1', label: mode === 'intensity' ? 'Sin intensidad' : 'Sin RPE' };
  // Continuous presentation scale, not exercise zones or clinical thresholds.
  const fraction = mode === 'intensity' ? Math.max(0,Math.min(1,(value-50)/50)) : Math.max(0,Math.min(1,(value-1)/9));
  const start = fraction < .5 ? [49,125,91] : [174,128,41];
  const end = fraction < .5 ? [174,128,41] : [180,66,62];
  const t = fraction < .5 ? fraction*2 : (fraction-.5)*2;
  const rgb = start.map((v,i) => Math.round(v+(end[i]-v)*t));
  return { value, color: `rgb(${rgb.join(',')})`, background: `rgba(${rgb.join(',')},0.09)`,
    label: mode === 'intensity' ? `${Math.round(value)} % · origen` : `RPE ${value}/10` };
}
