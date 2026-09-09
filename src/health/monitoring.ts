import { comparableSeries, median, minusDays, type DailyPoint } from './metrics/daily-series';
import { MONITORING_METRICS } from './monitoring-metrics';
import { quantile } from './evolution';

export function monitoringSummary(points: DailyPoint[], asOf: string) {
  return MONITORING_METRICS.flatMap(metric => {
    const series = comparableSeries(points, metric.key, asOf).points;
    const last = series.at(-1);
    if (!last || last.physiologicalDate < minusDays(asOf, 28)) return [];
    // Exclude the current, potentially incomplete day from comparisons.
    const recent = series.filter(p => p.physiologicalDate >= minusDays(asOf, 7) && p.physiologicalDate < asOf);
    const prior = series.filter(p => p.physiologicalDate >= minusDays(asOf, 35) && p.physiologicalDate < minusDays(asOf, 7));
    const eligible = Boolean(last.provider) && recent.length >= 5 && prior.length >= 20;
    const recentMedian = median(recent.map(p => p.value));
    const reference = median(prior.map(p => p.value));
    return [{ ...metric, last, recent, prior, recentMedian, reference,
      delta: eligible && recentMedian !== null && reference !== null ? recentMedian - reference : null }];
  });
}

export function sleepConsistency(points: DailyPoint[], asOf: string) {
  const rows = comparableSeries(points, 'sleep_duration', asOf).points.filter(p => p.physiologicalDate >= minusDays(asOf, 28) && p.physiologicalDate < asOf);
  if (rows.length < 20 || !rows.at(-1)?.provider) return null;
  const values = rows.map(p => p.value), center = median(values)!;
  return { count: rows.length, center, q25: quantile(values, .25)!, q75: quantile(values, .75)!,
    typicalDeviation: median(values.map(v => Math.abs(v - center)))!, start: rows[0].physiologicalDate, end: rows.at(-1)!.physiologicalDate };
}

const QUESTIONS = [
  { id: 'sleep-rhr', title: '¿Cómo coincide la duración del sueño con tu pulso en reposo?', x: 'sleep_duration', y: 'resting_heart_rate', lag: 0 },
  { id: 'steps-sleep', title: '¿Duermes distinto después de los días con más pasos?', x: 'steps', y: 'sleep_duration', lag: 1 },
] as const;
export function personalPatterns(points: DailyPoint[], asOf: string) {
  return QUESTIONS.flatMap(question => {
    const xRows = comparableSeries(points, question.x, asOf).points;
    const yRows = comparableSeries(points, question.y, asOf).points;
    if (!xRows.at(-1)?.provider || !yRows.at(-1)?.provider) return [];
    const xByDate = new Map(xRows.map(p => [p.physiologicalDate, p]));
    const pairs = yRows.filter(p => p.physiologicalDate >= minusDays(asOf, 90) && p.physiologicalDate < asOf).flatMap(y => {
      const x = xByDate.get(minusDays(y.physiologicalDate, question.lag));
      return x ? [{ date: y.physiologicalDate, xDate: x.physiologicalDate, x: x.value, y: y.value }] : [];
    });
    if (pairs.length < 40) return [];
    const split = Math.floor(pairs.length / 2), first = pairs.slice(0, split), second = pairs.slice(split);
    // Freeze the threshold on the first half, then check a later, disjoint period.
    const threshold = median(first.map(p => p.x))!;
    const group = (rows: typeof pairs) => {
      const low = rows.filter(p => p.x <= threshold), high = rows.filter(p => p.x > threshold);
      const lowMedian = median(low.map(p => p.y)), highMedian = median(high.map(p => p.y));
      return { low, high, lowMedian, highMedian, delta: low.length >= 6 && high.length >= 6 ? highMedian! - lowMedian! : null };
    };
    const discovery = group(first), validation = group(second);
    const sameDirection = discovery.delta !== null && validation.delta !== null && discovery.delta !== 0 && validation.delta !== 0 && Math.sign(discovery.delta) === Math.sign(validation.delta);
    const repeated = sameDirection && Math.min(Math.abs(discovery.delta!), Math.abs(validation.delta!)) / Math.max(Math.abs(discovery.delta!), Math.abs(validation.delta!)) >= .5;
    return [{ ...question, pairs, threshold, discovery, validation, repeated }];
  });
}
