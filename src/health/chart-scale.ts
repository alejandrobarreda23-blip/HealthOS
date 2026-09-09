import { quantile } from './evolution';

/** Focus is an explicit visual crop. Callers must clip paths and mark omitted observations. */
export function chartDomain(values: number[], { key, focused = false, reference = [], offset = 0, circular = false }: { key: string; focused?: boolean; reference?: number[]; offset?: number; circular?: boolean }) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return { low: 0, high: 1 };
  const minimumSpan = ({ steps: 1000, sleep_duration: 30, bedtime: 30, resting_heart_rate: 4, oxygen_saturation: 1, sleep_efficiency: 1, temperature_deviation: .1 } as Record<string, number>)[key] ?? 2;
  const all = [...finite, ...reference.filter(Number.isFinite)];
  let low = focused ? quantile(finite, .25)! : Math.min(...all);
  let high = focused ? quantile(finite, .75)! : Math.max(...all);
  const middle = (high + low) / 2, span = Math.max(minimumSpan, high - low);
  const padding = span * (focused ? .25 : .08);
  low = middle - span / 2 - padding; high = middle + span / 2 + padding;
  const nonnegative = !circular && key !== 'temperature_deviation';
  if (nonnegative && finite.every(v => v + offset >= 0)) low = Math.max(-offset, low);
  if (['oxygen_saturation', 'sleep_efficiency'].includes(key) && finite.every(v => v + offset <= 100)) high = Math.min(100 - offset, high);
  if (focused) {
    const full = chartDomain(values, { key, reference, offset, circular });
    low = Math.max(low, full.low); high = Math.min(high, full.high);
  }
  return { low: low === 0 ? 0 : low, high: Math.max(low + .01, high) };
}
