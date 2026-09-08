import type { TrainingSession } from '../repositories/activities';
import { nonnegative, sessionSeconds } from './activities';
import { evaluateMetric } from './metrics/evaluation';
import { median, minusDays, type DailyPoint } from './metrics/daily-series';

export const CONTEXT_METRICS = [
  { key: 'sleep_duration', label: 'Sueño', unit: 'min', color: '#70658a' },
  { key: 'hrv_rmssd', label: 'HRV', unit: 'ms', color: '#367870' },
  { key: 'resting_heart_rate', label: 'FC en reposo', unit: 'bpm', color: '#a56649' },
];
export function contextDates(date: string) {
  return Array.from({ length: 36 }, (_, i) => minusDays(date, 28-i));
}
export function trainingTotals(sessions: TrainingSession[]) {
  const seconds = sessions.map(sessionSeconds).filter((v): v is number => v !== null);
  const elevation = sessions.map(s => nonnegative(s.elevation_gain_m)).filter((v): v is number => v !== null);
  return { count: sessions.length, seconds: seconds.length ? seconds.reduce((a,b) => a+b,0) : null,
    durationCount: seconds.length, elevation: elevation.length ? elevation.reduce((a,b) => a+b,0) : null,
    elevationCount: elevation.length, days: new Set(sessions.map(s => s.physiological_date)).size };
}
export function contextTraining(session: TrainingSession, input: TrainingSession[], today: string) {
  const sessions = [...new Map(input.map(s => [s.id,s])).values()].filter(s => s.physiological_date <= today);
  const date = session.physiological_date;
  const previous = (days: number) => sessions.filter(s => s.physiological_date >= minusDays(date,days) && s.physiological_date < date);
  const sameSportDays = new Set(sessions.filter(s => s.activity_type === session.activity_type).map(s => s.physiological_date));
  let consecutive = 1;
  while (sameSportDays.has(minusDays(date,consecutive))) consecutive++;
  const trailing = sessions.filter(s => s.physiological_date >= minusDays(date,6) && s.physiological_date <= date && s.started_at <= session.started_at);
  const total = trainingTotals(trailing);
  const seconds = sessionSeconds(session);
  const share = seconds !== null && total.seconds && total.durationCount === total.count ? seconds / total.seconds * 100 : null;
  const after = sessions.filter(s => s.physiological_date > date && s.physiological_date <= minusDays(date,-7));
  return { previous7: trainingTotals(previous(7)), previous28: trainingTotals(previous(28)), previous7Sessions: previous(7),
    consecutive, share, trailing, after, sessions,
    days: contextDates(date).map(day => ({ date: day, sessions: sessions.filter(s => s.physiological_date === day) })) };
}
export function contextSignal(points: DailyPoint[], key: string, date: string, today: string) {
  const ordered = points.filter(p => p.metricKey === key && p.physiologicalDate <= today).sort((a,b) => a.physiologicalDate.localeCompare(b.physiologicalDate));
  // Freeze the established Body reference as of the day before the session.
  // Its reference ends before the seven recent days, so recent and reference do not overlap.
  const evaluation = evaluateMetric(ordered,key,minusDays(date,1));
  const sourceKey = evaluation.latest?.sourceKey;
  const reference = evaluation.baseline;
  const referenceRows = evaluation.points.filter(p => p.physiologicalDate >= evaluation.referenceStart && p.physiologicalDate <= evaluation.referenceEnd);
  const anchor = referenceRows.at(-1)?.physiologicalDate;
  const comparable = (p: DailyPoint) => Boolean(anchor && p.provider && p.sourceKey === sourceKey &&
    !ordered.some(other => other.physiologicalDate >= (anchor < p.physiologicalDate ? anchor : p.physiologicalDate) && other.physiologicalDate <= (anchor > p.physiologicalDate ? anchor : p.physiologicalDate) && other.sourceKey !== sourceKey));
  const before = ordered.filter(p => p.physiologicalDate >= minusDays(date,7) && p.physiologicalDate < date);
  const after = ordered.filter(p => p.physiologicalDate > date && p.physiologicalDate <= minusDays(date,-7));
  const summarize = (rows: DailyPoint[]) => {
    const eligible = rows.filter(comparable);
    const value = eligible.length >= 4 && reference.sufficient ? median(eligible.map(p => p.value)) : null;
    return { count: rows.length, comparableCount: eligible.length, value,
      delta: value !== null && reference.median !== null ? value-reference.median : null };
  };
  return { key, evaluation, sourceKey, reference, referenceRows, before: summarize(before), after: summarize(after),
    points: ordered.filter(p => p.physiologicalDate >= minusDays(date,28) && p.physiologicalDate <= minusDays(date,-7)),
    comparable, sourceChanged: new Set(ordered.filter(p => p.physiologicalDate >= minusDays(date,28) && p.physiologicalDate <= minusDays(date,-7)).map(p => p.sourceKey)).size > 1 };
}
export function comparableActivities(session: TrainingSession, sessions: TrainingSession[], nearby = false) {
  return sessions.filter(s => s.id !== session.id && s.activity_type === session.activity_type && s.provider === session.provider && s.source_device === session.source_device
    && s.physiological_date >= minusDays(session.physiological_date,90) && s.physiological_date < session.physiological_date)
    .filter(s => !nearby || ([['distance_m',1000],['elevation_gain_m',100]] as const).every(([key,floor]) => {
      const a=nonnegative(s[key]), b=nonnegative(session[key]);
      return a !== null && b !== null && Math.abs(a-b) <= Math.max(floor,b*.3);
    }));
}
