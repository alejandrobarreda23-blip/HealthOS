import { supabase } from '../lib/supabase';
import { canonicalDailySeries, type DailyInput } from '../health/metrics/daily-series';
import { readAllPages } from './pagination';
import { MONITORING_METRICS } from '../health/monitoring-metrics';
import { BODY_CORE_METRICS, normalizeEvidenceKind, type BodyHistoryDay, type BodyHistorySnapshot } from '../body/view-state';

export async function getBodyHistory(userId: string, startDate: string, endDate: string): Promise<BodyHistorySnapshot> {
  const client = supabase;
  if (!client) return { startDate, endDate, latestObservedDate: null, days: [], points: [] };
  const [observations, exercise] = await Promise.all([
    readAllPages((from, to) => client.from('observations')
      .select('id,physiological_date,metric_key,value_numeric,unit,data_level,provider,source_device,normalizer_version,started_at,ended_at')
      .eq('user_id', userId).in('metric_key', MONITORING_METRICS.map(metric => metric.key))
      .gte('physiological_date', startDate).lte('physiological_date', endDate)
      .order('physiological_date').order('id').range(from, to)),
    readAllPages((from, to) => client.from('exercise_sessions')
      .select('id,physiological_date,started_at,ended_at,elevation_gain_m,data_level')
      .eq('user_id', userId).gte('physiological_date', startDate).lte('physiological_date', endDate)
      .order('physiological_date').order('id').range(from, to)),
  ]);
  const input: DailyInput[] = observations.map(row => ({ id: row.id, metricKey: row.metric_key,
    physiologicalDate: row.physiological_date, value: row.value_numeric === null ? null : Number(row.value_numeric),
    startedAt: row.started_at, endedAt: row.ended_at, unit: row.unit, dataLevel: row.data_level, provider: row.provider,
    sourceDevice: row.source_device, normalizerVersion: row.normalizer_version }));
  const points = canonicalDailySeries(input);
  const dayMap = new Map<string, BodyHistoryDay>();
  const ensure = (date: string): BodyHistoryDay => {
    const day = dayMap.get(date) ?? { date, metrics: {}, exerciseCount: 0, exerciseMinutes: 0,
      exerciseElevationM: 0, coverage: 0, evidenceKinds: [] };
    dayMap.set(date, day); return day;
  };
  for (const point of points) {
    const day = ensure(point.physiologicalDate);
    const evidence = point.dataLevel === 'mixed' ? 'mixed' : normalizeEvidenceKind(point.dataLevel);
    day.metrics[point.metricKey] = { metricKey: point.metricKey, value: point.value, unit: point.unit,
      provider: point.provider ?? null, evidence, sourceKey: point.sourceKey, observationIds: point.observationIds };
    day.evidenceKinds.push(evidence);
  }
  for (const row of exercise) {
    const day = ensure(row.physiological_date);
    day.exerciseCount++;
    const minutes = (Date.parse(row.ended_at) - Date.parse(row.started_at)) / 60000;
    if (Number.isFinite(minutes) && minutes >= 0) day.exerciseMinutes += minutes;
    if (row.elevation_gain_m !== null) day.exerciseElevationM += Number(row.elevation_gain_m) || 0;
    day.evidenceKinds.push(normalizeEvidenceKind(row.data_level));
  }
  const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of days) {
    day.coverage = BODY_CORE_METRICS.filter(key => day.metrics[key]).length / BODY_CORE_METRICS.length;
    day.evidenceKinds = [...new Set(day.evidenceKinds)];
  }
  return { startDate, endDate, days, points, latestObservedDate: days.at(-1)?.date ?? null };
}
