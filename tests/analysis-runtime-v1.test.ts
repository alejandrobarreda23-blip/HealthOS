import { describe, expect, it } from 'vitest';
import { buildRuntimeAnalysisV1 } from '../src/services/analysis-runtime-v1';

function dates(end: string, n: number) {
  const out: string[] = [];
  const d = new Date(`${end}T12:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

describe('analysis runtime v1', () => {
  it('builds a brief from real-shaped normalized observations without filling gaps', () => {
    const allDates = dates('2026-08-30', 60);
    const observations = allDates.flatMap((date, i) => [
      { metricKey: 'hrv_rmssd', physiologicalDate: date, value: i >= 53 ? 60 : 75, provider: 'intervals_icu' },
      { metricKey: 'resting_heart_rate', physiologicalDate: date, value: 48, provider: 'intervals_icu' },
      { metricKey: 'sleep_duration', physiologicalDate: date, value: 440, provider: 'intervals_icu' },
      { metricKey: 'steps', physiologicalDate: date, value: 9000, provider: 'intervals_icu' },
      { metricKey: 'oxygen_saturation', physiologicalDate: date, value: 97, provider: 'intervals_icu' },
    ]);
    const result = buildRuntimeAnalysisV1({ asOfDate: '2026-08-30', observations, exercises: [], events: [] });
    expect(result.brief.dataQuality.overallCoverage).toBe(1);
    expect(result.baselines.hrv_rmssd.sufficient).toBe(true);
    expect(result.findings.some((f) => f.findingKey === 'sustained_hrv_drop')).toBe(true);
  });

  it('emits data-quality finding when recent data are sparse', () => {
    const observations = [
      { metricKey: 'hrv_rmssd', physiologicalDate: '2026-08-30', value: 70, provider: 'intervals_icu' },
    ];
    const result = buildRuntimeAnalysisV1({ asOfDate: '2026-08-30', observations, exercises: [], events: [] });
    expect(result.findings.some((f) => f.findingKey === 'insufficient_recent_data')).toBe(true);
    expect(result.brief.uncertainty).toContain('low_recent_data_coverage');
  });
});
