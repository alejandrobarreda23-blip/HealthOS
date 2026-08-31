import { describe, expect, it } from 'vitest';
import { detectSourceTransitionsV1, inferUnknownGapsV1 } from '../src/health/missingness-v1';

describe('missingness v1', () => {
  it('preserves absence as unknown rather than inventing device_not_worn', () => {
    const gaps = inferUnknownGapsV1('2026-08-01', '2026-08-02', ['hrv_rmssd'], [
      { date: '2026-08-01', metricKey: 'hrv_rmssd', provider: 'intervals_icu' },
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].date).toBe('2026-08-02');
    expect(gaps[0].reason).toBe('unknown');
  });

  it('detects an explicit provider transition without calling it physiological', () => {
    const transitions = detectSourceTransitionsV1([
      { date: '2026-07-01', metricKey: 'hrv_rmssd', provider: 'intervals_icu', sourceDevice: 'Suunto' },
      { date: '2026-08-01', metricKey: 'hrv_rmssd', provider: 'oura', sourceDevice: 'Oura Ring' },
    ]);
    expect(transitions).toHaveLength(1);
    expect(transitions[0].eventType).toBe('provider_change');
    expect(transitions[0].comparability).toBe('transition_sensitive');
  });
});
