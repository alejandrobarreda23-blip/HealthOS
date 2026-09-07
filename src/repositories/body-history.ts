import { supabase } from '../lib/supabase';
import {
  BODY_CORE_METRICS,
  mergeEvidenceKinds,
  normalizeEvidenceKind,
  type BodyEvidenceKind,
  type BodyHistoryDay,
  type BodyHistorySnapshot,
  type BodyMetricValue,
} from '../body/view-state';

const BODY_METRICS = [...BODY_CORE_METRICS, 'weight'];

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function asDate(value: unknown) {
  const text = typeof value === 'string' ? value : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function minutesBetween(startedAt: unknown, endedAt: unknown) {
  const start = typeof startedAt === 'string' ? new Date(startedAt).getTime() : NaN;
  const end = typeof endedAt === 'string' ? new Date(endedAt).getTime() : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, (end - start) / 60000);
}

export async function getBodyHistory(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<BodyHistorySnapshot> {
  if (!supabase) return { startDate, endDate, latestObservedDate: null, days: [] };

  const [observations, exercise] = await Promise.all([
    supabase
      .from('observations')
      .select('physiological_date,metric_key,value_numeric,unit,data_level,provider')
      .eq('user_id', userId)
      .in('metric_key', BODY_METRICS)
      .gte('physiological_date', startDate)
      .lte('physiological_date', endDate)
      .order('physiological_date', { ascending: true }),
    supabase
      .from('exercise_sessions')
      .select('physiological_date,started_at,ended_at,elevation_gain_m,data_level')
      .eq('user_id', userId)
      .gte('physiological_date', startDate)
      .lte('physiological_date', endDate)
      .order('physiological_date', { ascending: true }),
  ]);

  if (observations.error) throw observations.error;
  if (exercise.error) throw exercise.error;

  const dayMap = new Map<string, {
    values: Map<string, { values: number[]; unit: string | null; evidence: BodyEvidenceKind[]; providers: string[] }>;
    exerciseCount: number;
    exerciseMinutes: number;
    exerciseElevationM: number;
    exerciseEvidence: BodyEvidenceKind[];
  }>();

  function ensure(date: string) {
    const current = dayMap.get(date);
    if (current) return current;
    const next = {
      values: new Map<string, { values: number[]; unit: string | null; evidence: BodyEvidenceKind[]; providers: string[] }>(),
      exerciseCount: 0,
      exerciseMinutes: 0,
      exerciseElevationM: 0,
      exerciseEvidence: [] as BodyEvidenceKind[],
    };
    dayMap.set(date, next);
    return next;
  }

  for (const row of observations.data ?? []) {
    const date = asDate((row as any).physiological_date);
    const metricKey = typeof (row as any).metric_key === 'string' ? (row as any).metric_key : '';
    const numeric = Number((row as any).value_numeric);
    if (!date || !metricKey || !Number.isFinite(numeric)) continue;

    const day = ensure(date);
    const bucket: {
      values: number[];
      unit: string | null;
      evidence: BodyEvidenceKind[];
      providers: string[];
    } = day.values.get(metricKey) ?? {
      values: [],
      unit: typeof (row as any).unit === 'string' ? (row as any).unit : null,
      evidence: [],
      providers: [],
    };

    bucket.values.push(numeric);
    bucket.evidence.push(normalizeEvidenceKind((row as any).data_level));
    if (typeof (row as any).provider === 'string') bucket.providers.push((row as any).provider);
    day.values.set(metricKey, bucket);
  }

  for (const row of exercise.data ?? []) {
    const date = asDate((row as any).physiological_date);
    if (!date) continue;
    const day = ensure(date);
    day.exerciseCount += 1;
    day.exerciseMinutes += minutesBetween((row as any).started_at, (row as any).ended_at);
    const elevation = Number((row as any).elevation_gain_m);
    if (Number.isFinite(elevation)) day.exerciseElevationM += elevation;
    day.exerciseEvidence.push(normalizeEvidenceKind((row as any).data_level));
  }

  const days: BodyHistoryDay[] = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, raw]) => {
      const metrics: Record<string, BodyMetricValue> = {};
      const evidenceKinds: BodyEvidenceKind[] = [...raw.exerciseEvidence];

      for (const [metricKey, bucket] of raw.values.entries()) {
        const value = median(bucket.values);
        if (value === null) continue;
        const evidence = mergeEvidenceKinds(bucket.evidence);
        evidenceKinds.push(...bucket.evidence);
        metrics[metricKey] = {
          metricKey,
          value,
          unit: bucket.unit,
          evidence,
          provider: bucket.providers[0] ?? null,
        };
      }

      const observedCore = BODY_CORE_METRICS.filter((metric) => metrics[metric]).length;
      return {
        date,
        metrics,
        exerciseCount: raw.exerciseCount,
        exerciseMinutes: raw.exerciseMinutes,
        exerciseElevationM: raw.exerciseElevationM,
        coverage: observedCore / BODY_CORE_METRICS.length,
        evidenceKinds: [...new Set(evidenceKinds)],
      };
    });

  return {
    startDate,
    endDate,
    latestObservedDate: days.length ? days[days.length - 1].date : null,
    days,
  };
}
