import { describe, it, expect } from 'vitest';
import { canonicalDailySeries, minusDays, type DailyInput } from '../src/health/metrics/daily-series';
import { monitoringSummary, personalPatterns, sleepConsistency } from '../src/health/monitoring';
const asOf = '2026-09-09';
const input: DailyInput[] = Array.from({ length: 80 }, (_, i) => [
  { metricKey: 'sleep_duration', value: i % 2 ? 480 : 360, unit: 'min' },
  { metricKey: 'resting_heart_rate', value: i % 2 ? 48 : 54, unit: 'bpm' },
  { metricKey: 'steps', value: i % 2 ? 4000 : 8000, unit: 'count' },
].map(m => ({ ...m, physiologicalDate: minusDays(asOf, 80 - i), provider: 'ultrahuman', sourceDevice: 'ring', normalizerVersion: 'v1' }))).flat();
const points = canonicalDailySeries(input);
describe('Personal monitoring evidence', () => {
  it('counts days, not duplicate sensor samples', () => {
    const duplicate = canonicalDailySeries([...input, ...input]);
    expect(personalPatterns(duplicate, asOf)[0].pairs).toHaveLength(80);
    expect(sleepConsistency(duplicate, asOf)?.count).toBe(28);
  });
  it('checks the direction in disjoint later dates', () => {
    const r = personalPatterns(points, asOf)[0];
    expect(r.repeated).toBe(true);
    expect(r.discovery.delta).toBe(-6);
    expect(r.validation.delta).toBe(-6);
    expect(r.discovery.low.every(p => !r.validation.low.some(q => p.date === q.date))).toBe(true);
  });
  it('reports a failure to repeat instead of selecting a favorable window', () => {
    const changed = points.map(p => p.metricKey === 'resting_heart_rate' && p.physiologicalDate >= minusDays(asOf, 40) ? { ...p, value: 102 - p.value } : p);
    expect(personalPatterns(changed, asOf)[0].repeated).toBe(false);
  });
  it('pairs steps with exactly the next calendar day, never the next available record', () => {
    const missing = points.filter(p => !(p.metricKey === 'sleep_duration' && p.physiologicalDate === minusDays(asOf, 10)));
    const r = personalPatterns(missing, asOf).find(p => p.id === 'steps-sleep')!;
    expect(r.pairs.every(p => p.xDate === minusDays(p.date, 1))).toBe(true);
    expect(r.pairs.some(p => p.date === minusDays(asOf, 10))).toBe(false);
  });
  it('does not publish sparse or unknown-source relationships', () => {
    expect(personalPatterns(points.slice(-60), asOf)).toEqual([]);
    expect(personalPatterns(points.map(p => ({ ...p, provider: null })), asOf)).toEqual([]);
    expect(sleepConsistency(points.slice(-30), asOf)).toBeNull();
  });
  it('does not bridge source changes or use the unfinished current day', () => {
    const changed = points.map(p => p.physiologicalDate >= minusDays(asOf, 15) ? { ...p, sourceKey: 'new-device' } : p);
    expect(personalPatterns(changed, asOf)).toEqual([]);
    const current = { ...points.find(p => p.metricKey === 'sleep_duration')!, physiologicalDate: asOf, value: 900 };
    expect(sleepConsistency([...points, current], asOf)).toEqual(sleepConsistency(points, asOf));
  });
  it('preserves provider HRV identity instead of filling RMSSD', () => {
    const provider = canonicalDailySeries([{ metricKey: 'ultrahuman_sleep_hrv', physiologicalDate: asOf, value: 94, unit: 'ms', provider: 'ultrahuman' }]);
    expect(provider[0].metricKey).toBe('ultrahuman_sleep_hrv');
    expect(monitoringSummary(provider, asOf).map(p => p.key)).toEqual(['ultrahuman_sleep_hrv']);
  });
  it('does not present an old measurement as a current comparison', () => {
    expect(monitoringSummary(points, '2026-12-01')).toEqual([]);
  });
});
