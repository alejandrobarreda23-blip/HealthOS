import { getMetricDefinition } from './dictionary';

export const DAILY_SERIES_VERSION = 'canonical_daily_v2';
export interface DailyInput {
  id?: string;
  metricKey: string;
  physiologicalDate: string;
  value: number | null;
  unit?: string | null;
  provider?: string | null;
  sourceDevice?: string | null;
  normalizerVersion?: string | null;
  dataLevel?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
}
export interface DailyPoint extends DailyInput {
  value: number;
  unit: string;
  sourceKey: string;
  observationIds: string[];
  sampleCount: number;
  alternativeSources: number;
  aggregation: 'median' | 'sum_nonoverlapping';
}
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
}
export function minusDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function converted(row: DailyInput): DailyInput | null {
  const def = getMetricDefinition(row.metricKey);
  if (!def || row.value === null || !Number.isFinite(row.value)) return null;
  // Undefined is the legacy in-memory canonical contract; explicit missing units from storage are rejected.
  const unit = row.unit === undefined ? def.canonicalUnit : row.unit;
  let value = row.value;
  if (unit !== def.canonicalUnit) {
    if (row.metricKey === 'weight' && unit === 'lb') value *= 0.45359237;
    else if (row.metricKey === 'sleep_duration' && unit === 'h') value *= 60;
    else if (row.metricKey === 'sleep_duration' && unit === 's') value /= 60;
    else return null;
  }
  return { ...row, value, unit: def.canonicalUnit };
}
/** One daily summary per metric, from one explicitly identified source. Never average providers. */
export function canonicalDailySeries(input: DailyInput[]): DailyPoint[] {
  const buckets = new Map<string, Map<string, DailyInput[]>>();
  for (const raw of input) {
    const row = converted(raw);
    if (!row || !/^\d{4}-\d{2}-\d{2}$/.test(row.physiologicalDate)) continue;
    const dayKey = `${row.metricKey}|${row.physiologicalDate}`;
    const sourceKey = JSON.stringify([row.provider ?? 'unknown', row.sourceDevice ?? 'unknown', row.normalizerVersion ?? 'unknown']);
    const sources = buckets.get(dayKey) ?? new Map<string, DailyInput[]>();
    sources.set(sourceKey, [...(sources.get(sourceKey) ?? []), row]);
    buckets.set(dayKey, sources);
  }
  return [...buckets.values()].flatMap(sources => {
    const candidates = [...sources.entries()].map(([key, inputRows]) => {
      const rows = [...new Map(inputRows.map(r => [r.id ?? JSON.stringify([r.startedAt, r.endedAt, r.value]), r])).values()];
      const intervalMetric = rows[0].provider === 'health_connect' && ['steps', 'sleep_duration'].includes(rows[0].metricKey);
      if (intervalMetric) {
        rows.sort((a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? ''));
        if (rows.some((r, i) => !r.startedAt || !r.endedAt || !Number.isFinite(Date.parse(r.startedAt)) || !Number.isFinite(Date.parse(r.endedAt)) || Date.parse(r.endedAt) <= Date.parse(r.startedAt) || (i > 0 && Date.parse(r.startedAt) < Date.parse(rows[i - 1].endedAt!)))) return null;
      }
      return { key, rows, intervalMetric };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
    const ranked = candidates.sort(({key: ak, rows: a}, {key: bk, rows: b}) => {
      const preferred = getMetricDefinition(a[0].metricKey)!.preferredSources;
      const rank = (provider: string | null | undefined) => { const i = preferred.indexOf(provider ?? ''); return i < 0 ? preferred.length : i; };
      return rank(a[0].provider) - rank(b[0].provider) || ak.localeCompare(bk);
    });
    if (!ranked.length) return [];
    const { key: sourceKey, rows, intervalMetric } = ranked[0];
    const values = rows.map(row => row.value!);
    return [{ ...rows[0], value: intervalMetric ? values.reduce((a, b) => a + b, 0) : median(values)!, unit: rows[0].unit!, sourceKey,
      dataLevel: new Set(rows.map(r => r.dataLevel)).size === 1 ? rows[0].dataLevel : 'mixed',
      observationIds: [...new Set(rows.flatMap(r => r.id ? [r.id] : []))], sampleCount: values.length,
      alternativeSources: sources.size - 1, aggregation: intervalMetric ? 'sum_nonoverlapping' as const : 'median' as const }];
  }).sort((a, b) => a.physiologicalDate.localeCompare(b.physiologicalDate) || a.metricKey.localeCompare(b.metricKey));
}
/** Keep only the latest uninterrupted source segment, bounded by the explored date. */
export function comparableSeries(points: DailyPoint[], metricKey: string, asOfDate: string) {
  const all = points.filter(p => p.metricKey === metricKey && p.physiologicalDate <= asOfDate);
  const last = all[all.length - 1];
  if (!last) return { points: [] as DailyPoint[], transition: false };
  let start = all.length - 1;
  while (start > 0 && all[start - 1].sourceKey === last.sourceKey) start--;
  return { points: all.slice(start), transition: start > 0 };
}
