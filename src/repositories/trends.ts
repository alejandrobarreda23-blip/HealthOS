import { getBodyHistory } from './body-history';
import type { BodyHistorySnapshot } from '../body/view-state';
import { evaluateMetric } from '../health/metrics/evaluation';
import { minusDays } from '../health/metrics/daily-series';
export interface TrendPointV1 { date: string; value: number; coverage: number | null; sourceKey?: string; }
export interface BaselineBandPointV1 { date: string; median: number | null; p25: number | null; p75: number | null; sufficient: boolean; sourceKey?: string; }
export interface TrendEventV1 { date: string; kind: 'training'; count: number; durationMinutes: number; }
export function selectTrend(history: BodyHistorySnapshot | null, metricKey: string, startDate: string, endDate: string) {
  const series = history?.points ?? [];
  const visible = series.filter(p => p.metricKey === metricKey && p.physiologicalDate >= startDate && p.physiologicalDate <= endDate);
  const points: TrendPointV1[] = visible.map(p => ({ date: p.physiologicalDate, value: p.value, coverage: 1, sourceKey: p.sourceKey }));
  const baselines: BaselineBandPointV1[] = visible.map(p => {
    const e = evaluateMetric(series, metricKey, p.physiologicalDate);
    return { date: p.physiologicalDate, median: e.baseline.median, p25: e.baseline.p25, p75: e.baseline.p75,
      sufficient: e.baseline.sufficient && e.status !== 'not_comparable', sourceKey: p.sourceKey };
  });
  const events: TrendEventV1[] = (history?.days ?? []).filter(d => d.date >= startDate && d.date <= endDate && d.exerciseCount > 0)
    .map(d => ({ date: d.date, kind: 'training', count: d.exerciseCount, durationMinutes: d.exerciseMinutes }));
  return { points, baselines, events };
}
export async function getTrendV1(userId: string, metricKey: string, startDate: string, endDate: string) {
  return selectTrend(await getBodyHistory(userId, minusDays(startDate, 120), endDate), metricKey, startDate, endDate);
}
