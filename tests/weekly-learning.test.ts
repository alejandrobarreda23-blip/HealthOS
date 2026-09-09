import { describe, expect, it } from 'vitest';
import { canonicalDailySeries, minusDays } from '../src/health/metrics/daily-series';
import { buildWeeklyLearning, clockSummary, formatClock, lastCompletedSunday, matchDays, sleepRhythm, weeklyQuestions, type MatchedDay, type WeeklyInput } from '../src/health/weekly-learning';
import { parseQuestionMemory, stableJSON, weeklyAssociationRows } from '../src/health/weekly-memory';
const end = '2026-09-06';
function fixture(count = 112): WeeklyInput {
  const dates = Array.from({ length: count }, (_, i) => minusDays(end, count - 1 - i));
  const points = canonicalDailySeries(dates.flatMap((date, i) => [
    { metricKey: 'sleep_duration', value: i % 4 < 2 ? 420 : 480, unit: 'min' },
    { metricKey: 'resting_heart_rate', value: i % 4 < 2 ? 54 : 48, unit: 'bpm' },
    { metricKey: 'steps', value: 4000 + (i % 3) * 600, unit: 'count' },
    { metricKey: 'ultrahuman_sleep_hrv', value: 80 + (i % 4) * 5, unit: 'ms' },
  ].map(p => ({ ...p, physiologicalDate: date, provider: 'ultrahuman', sourceDevice: 'ring', normalizerVersion: 'v1', id: `${p.metricKey}-${date}` }))));
  return { points, sleeps: dates.map(date => ({ id: `sleep-${date}`, date, start: `${minusDays(date, 1)}T23:50:00Z`, end: `${date}T07:30:00Z`, timezone: 'UTC', provider: 'ultrahuman', device: 'ring', version: 'v1' })), events: [], checkIns: [] };
}
describe('Weekly sleep learning', () => {
  it('uses only completed Monday-Sunday weeks', () => {
    expect(lastCompletedSunday('2026-09-09')).toBe('2026-09-06');
    expect(lastCompletedSunday('2026-09-06')).toBe('2026-08-30');
    expect(lastCompletedSunday('2026-09-07')).toBe('2026-09-06');
    expect(lastCompletedSunday('2026-03-30')).toBe('2026-03-29');
  });
  it('handles midnight circularly instead of averaging to noon', () => {
    const result = clockSummary([1430, 10])!;
    expect(formatClock(result.minute)).toBe('00:00'); expect(result.deviation).toBe(10);
  });
  it('uses recorded timezone and rejects missing timezone or a foreign source', () => {
    const input = fixture(28);
    expect(sleepRhythm(input, end).recent.bedtime?.minute).toBe(1430);
    expect(sleepRhythm({ ...input, sleeps: input.sleeps.map(s => ({ ...s, timezone: 'Europe/Madrid' })) }, end).recent.bedtime?.minute).toBe(110);
    expect(sleepRhythm({ ...input, sleeps: input.sleeps.map(s => ({ ...s, timezone: null })) }, end).recent.bedtime).toBeNull();
    expect(sleepRhythm({ ...input, sleeps: input.sleeps.map(s => ({ ...s, version: 'different' })) }, end).recent.count).toBe(0);
  });
  it('does not count naps, duplicate sessions or samples as additional nights', () => {
    const input = fixture(28), naps = input.sleeps.map(s => ({ ...s, id: `nap-${s.id}`, start: `${s.date}T13:00:00Z`, end: `${s.date}T13:30:00Z` }));
    expect(sleepRhythm({ ...input, points: [...input.points, ...input.points], sleeps: [...input.sleeps, ...naps] }, end).recent.count).toBe(7);
  });
  it('rebuilds timing after a timezone transition, including A-B-A', () => {
    const input = fixture(28); input.sleeps[25].timezone = 'Europe/Madrid';
    expect(sleepRhythm(input, end).recent.count).toBe(2);
    expect(sleepRhythm(input, end).recent.bedtime).toBeNull();
  });
  it('keeps calibration and evaluation dates disjoint', () => {
    for (const q of weeklyQuestions(fixture(), end)) {
      if (!q.reference) continue;
      for (const block of q.blocks) for (const pair of block.matches) for (const day of [pair.lower, pair.higher]) {
        expect(day.date > q.reference.end).toBe(true);
        expect(day.exposureDates.every(d => d >= block.start && d > q.reference!.end)).toBe(true);
      }
    }
  });
  it('requires consecutive calendar nights for the two-night question', () => {
    const input = fixture(), missing = minusDays(end, 10);
    input.points = input.points.filter(p => !(p.metricKey === 'sleep_duration' && p.physiologicalDate === missing));
    const q = weeklyQuestions(input, end).find(q => q.id === 'short-nights-hrv')!;
    const days = q.blocks.flatMap(b => b.matches.flatMap(p => [p.lower, p.higher]));
    expect(days.every(d => d.exposureDates.length === 2 && d.exposureDates[0] === minusDays(d.exposureDates[1], 1) && !d.exposureDates.includes(missing))).toBe(true);
  });
  it('apart explicitly recorded travel or illness, without treating missing events as negatives', () => {
    const input = fixture(); input.events = [{ id: 'trip', date: minusDays(end, 30), endDate: end, type: 'travel' }];
    const q = weeklyQuestions(input, end)[0];
    expect(q.excludedContext).toBeGreaterThan(0);
    expect(q.blocks.flatMap(b => b.matches.flatMap(p => [p.lower, p.higher])).every(p => p.date < minusDays(end, 30))).toBe(true);
  });
  it('matches without reusing outcome or exposure dates and respects timezone', () => {
    const day = (date: string, timezone = 'UTC'): MatchedDay => ({ date, exposureDates: [minusDays(date, 1)], x: 1, y: 1, priorSleep: 420, steps: null, stress: null, timezone, observationIds: [] });
    const pairs = matchDays([day('2026-08-03'), day('2026-08-04'), day('2026-08-10')], [day('2026-08-05'), day('2026-08-11')], true);
    const dates = pairs.flatMap(p => [p.lower, p.higher].flatMap(d => [d.date, ...d.exposureDates]));
    expect(new Set(dates).size).toBe(dates.length);
    expect(matchDays([day('2026-08-03')], [day('2026-08-05', 'Europe/Madrid')], true)).toHaveLength(0);
  });
  it('requires independent blocks and revises inconsistent evidence', () => {
    const input = fixture();
    expect(weeklyQuestions(input, end)[0].state).toBe('repeated');
    input.points = input.points.map(p => p.metricKey === 'resting_heart_rate' && p.physiologicalDate >= minusDays(end, 27) ? { ...p, value: 102 - p.value } : p);
    expect(weeklyQuestions(input, end)[0].state).toBe('inconsistent');
  });
  it('rejects stale and changed-source comparisons', () => {
    expect(weeklyQuestions(fixture(), '2027-01-03')[0].state).toBe('insufficient');
    const input = fixture(); input.points = input.points.map(p => p.physiologicalDate >= minusDays(end, 10) ? { ...p, sourceKey: 'new-source' } : p);
    expect(weeklyQuestions(input, end)[0].state).toBe('collecting');
  });
  it('does not reinterpret provider HRV as RMSSD and handles empty profiles', () => {
    expect(weeklyQuestions(fixture(), end)[2].y).toBe('ultrahuman_sleep_hrv');
    const empty = buildWeeklyLearning({ points: [], sleeps: [], events: [], checkIns: [] }, end);
    expect(empty.changes).toHaveLength(0); expect(empty.rhythm.recent.bedtime).toBeNull();
    expect(empty.questions.every(q => q.state === 'collecting')).toBe(true);
  });
});
describe('Weekly memory', () => {
  it('has deterministic subject-scoped IDs and preserves different revisions', async () => {
    const report = buildWeeklyLearning(fixture(), end);
    const [a, b, other] = await Promise.all([weeklyAssociationRows('owner-a', report), weeklyAssociationRows('owner-a', report), weeklyAssociationRows('owner-b', report)]);
    expect(a.map(r => r.id)).toEqual(b.map(r => r.id)); expect(a[0].id).not.toBe(other[0].id);
    report.questions[0].state = 'inconsistent'; expect((await weeklyAssociationRows('owner-a', report))[0].id).not.toBe(a[0].id);
    expect(a[0].confidence).toBeNull();
  });
  it('validates saved evidence and keeps key order out of fingerprints', async () => {
    expect(stableJSON({ b: 1, a: 2 })).toBe(stableJSON({ a: 2, b: 1 }));
    const [row] = await weeklyAssociationRows('owner-a', buildWeeklyLearning(fixture(), end));
    expect(parseQuestionMemory({ ...row, created_at: '2026-09-09T10:00:00Z' })?.weekEnd).toBe(end);
    expect(parseQuestionMemory({ ...row, created_at: '2026-09-09', evidence: { ...row.evidence, state: 'diagnosis' } })).toBeNull();
  });
  it('does not use a future saved reference when exploring the past', async () => {
    const input = fixture(), [row] = await weeklyAssociationRows('owner-a', buildWeeklyLearning(input, end));
    const memory = parseQuestionMemory({ ...row, created_at: '2026-09-09T10:00:00Z' })!;
    expect(weeklyQuestions(input, minusDays(end, 95), [memory])[0].reference).toBeNull();
  });
});
