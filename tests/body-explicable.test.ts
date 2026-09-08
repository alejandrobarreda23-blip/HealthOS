import { describe, expect, it } from 'vitest';
import { canonicalDailySeries, minusDays, type DailyInput } from '../src/health/metrics/daily-series';
import { evaluateMetric } from '../src/health/metrics/evaluation';
import { buildRuntimeAnalysisV1 } from '../src/services/analysis-runtime-v1';
import { buildBaselineSnapshotV1 } from '../src/health/baselines/engine';
import { clampBodyDate, compareBodyMetric, relatedFindings, selectBody } from '../src/body/selectors';
import { selectTrend } from '../src/repositories/trends';
import { readAllPages } from '../src/repositories/pagination';
import type { BodyHistorySnapshot } from '../src/body/view-state';

const end = '2026-09-08';
function observations(metricKey = 'hrv_rmssd'): DailyInput[] {
  return Array.from({ length: 60 }, (_, i) => ({ id: String(i), metricKey,
    physiologicalDate: minusDays(end, 59 - i), value: i < 53 ? 70 + i % 3 : 50,
    unit: 'ms', provider: 'intervals_icu', sourceDevice: 'watch-a', normalizerVersion: 'v1', dataLevel: 'derived' }));
}
function history(input = observations()): BodyHistorySnapshot {
  return { startDate: minusDays(end, 180), endDate: end, latestObservedDate: end, days: [], points: canonicalDailySeries(input) };
}
describe('Body explicable: common daily series', () => {
  it('counts distinct days and remains unchanged by repeated copies', () => {
    const input = observations();
    expect(canonicalDailySeries([...input, ...input])).toEqual(canonicalDailySeries(input));
    const duplicateDay = Array.from({ length: 80 }, () => input[59]);
    const result = buildRuntimeAnalysisV1({ asOfDate: end, observations: duplicateDay as Array<DailyInput & { value: number }>, exercises: [], events: [] });
    expect(result.brief.dataQuality.byMetric.hrv_rmssd.observed).toBe(1);
    expect(result.baselines.hrv_rmssd.sufficient).toBe(false);
    expect(result.findings.filter(f => f.domain !== 'data_quality')).toHaveLength(0);
  });
  it('preserves equal independent measurements while removing copies by ID', () => {
    const sample = observations()[0];
    const rows = [{ ...sample, id: 'a', value: 50 }, { ...sample, id: 'b', value: 50 }, { ...sample, id: 'c', value: 80 }];
    expect(canonicalDailySeries([...rows, rows[2]])[0].value).toBe(50);
  });
  it('never coerces null to zero or silently accepts incompatible units', () => {
    const sample = observations()[0];
    expect(canonicalDailySeries([{ ...sample, value: null }, { ...sample, unit: null }, { ...sample, unit: 'kg' }])).toHaveLength(0);
    expect(canonicalDailySeries([{ ...sample, metricKey: 'steps', unit: 'count', value: 0 }])[0].value).toBe(0);
    expect(canonicalDailySeries([{ ...sample, metricKey: 'weight', unit: 'lb', value: 100 }])[0].value).toBeCloseTo(45.359237);
  });
  it('selects a source deterministically without averaging providers', () => {
    const a = observations()[0];
    const b = { ...a, id: 'alternative', provider: 'oura', value: 200 };
    expect(canonicalDailySeries([a, b])).toEqual(canonicalDailySeries([b, a]));
    expect(canonicalDailySeries([a, b])[0].value).toBe(a.value);
    expect(canonicalDailySeries([a, b])[0].alternativeSources).toBe(1);
  });
  it('sums non-overlapping Health Connect intervals and rejects overlaps', () => {
    const a = { ...observations()[0], metricKey: 'steps', unit: 'count', provider: 'health_connect', value: 100,
      startedAt: '2026-07-11T10:00:00Z', endedAt: '2026-07-11T11:00:00Z' };
    const b = { ...a, id: 'b', startedAt: a.endedAt, endedAt: '2026-07-11T12:00:00Z' };
    expect(canonicalDailySeries([a, b, a])[0].value).toBe(200);
    expect(canonicalDailySeries([a, { ...b, startedAt: a.startedAt }])).toHaveLength(0);
  });
});
describe('Body explicable: bounded evaluation and evidence', () => {
  it('produces the same reference and daily value in Body, Trends and runtime', () => {
    const input = observations(); const h = history(input);
    const body = selectBody(h, end).evaluations.hrv_rmssd;
    const trend = selectTrend(h, 'hrv_rmssd', minusDays(end, 29), end);
    const runtime = buildRuntimeAnalysisV1({ asOfDate: end, observations: input as Array<DailyInput & { value: number }>, exercises: [], events: [] });
    expect(body.current?.value).toBe(trend.points.at(-1)?.value);
    expect(body.current?.value).toBe(runtime.brief.recovery.hrv?.current);
    expect(body.baseline).toEqual(runtime.baselines.hrv_rmssd);
    expect(body.baseline.median).toBe(trend.baselines.at(-1)?.median);
    expect(body.finding).toEqual(runtime.findings.find(f => f.findingKey === 'sustained_hrv_drop'));
    expect(body.recentCount).toBe(7);
    expect(body.baseline.sampleCount).toBe(42);
    expect(body.status).toBe('detected');
  });
  it('excludes future observations from historical findings and references', () => {
    const input = observations(); const date = minusDays(end, 10);
    const a = evaluateMetric(canonicalDailySeries(input), 'hrv_rmssd', date);
    const b = evaluateMetric(canonicalDailySeries(input.map(r => r.physiologicalDate > date ? { ...r, value: 999 } : r)), 'hrv_rmssd', date);
    expect(a).toEqual(b);
  });
  it('blocks cross-source references and comparisons, including A-B-A transitions', () => {
    const input = observations().map((r, i) => i >= 53 ? { ...r, sourceDevice: 'watch-b' } : r);
    expect(evaluateMetric(canonicalDailySeries(input), 'hrv_rmssd', end).status).toBe('not_comparable');
    input[59].sourceDevice = 'watch-a';
    expect(compareBodyMetric(history(input), 'hrv_rmssd', end, minusDays(end, 10)).delta).toBeNull();
  });
  it('does not relabel a missing day as its latest historical observation', () => {
    const e = evaluateMetric(canonicalDailySeries(observations().slice(0, 59)), 'hrv_rmssd', end);
    expect(e.current).toBeNull();
    expect(e.latest?.physiologicalDate).toBe(minusDays(end, 1));
    expect(e.recentCount).toBe(6);
  });
  it('distinguishes evaluated-without-change from insufficient data', () => {
    const stable = observations().map(r => ({ ...r, value: 70 }));
    const e = evaluateMetric(canonicalDailySeries(stable), 'hrv_rmssd', end);
    expect(e.status).toBe('not_detected'); expect(e.baseline.mad).toBe(0);
    expect(e.finding).toBeNull();
    expect(evaluateMetric(canonicalDailySeries(stable.slice(-2)), 'hrv_rmssd', end).status).toBe('insufficient');
  });
  it('does not count duplicate baseline rows as distinct days', () => {
    const rows = Array.from({ length: 50 }, () => ({ date: end, value: 70 }));
    expect(buildBaselineSnapshotV1('hrv_rmssd', end, rows).sampleCount).toBe(1);
  });
  it('shares a finding across relevant systems without duplicate copies', () => {
    const f = evaluateMetric(canonicalDailySeries(observations()), 'hrv_rmssd', end).finding!;
    expect(relatedFindings([f, f], 'autonomic')).toHaveLength(1);
    expect(relatedFindings([f], 'recovery')).toHaveLength(1);
    expect(relatedFindings([f], 'metabolic')).toHaveLength(0);
  });
  it('keeps selected dates inside a narrowed timeline', () => {
    expect(clampBodyDate('2025-01-01', end, 30)).toBe(minusDays(end, 29));
    expect(clampBodyDate('2027-01-01', end, 30)).toBe(end);
  });
  it('reads beyond short server pages and propagates errors', async () => {
    const rows = await readAllPages<number>(async from => ({ data: from < 5 ? [from] : [], error: null }));
    expect(rows).toEqual([0, 1, 2, 3, 4]);
    await expect(readAllPages(async () => ({ data: null, error: { message: 'denied' } }))).rejects.toThrow('denied');
  });
});
