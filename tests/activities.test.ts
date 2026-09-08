import { describe, expect, it } from 'vitest';
import { activityComparison, durationLabel, nonnegative, numberLabel, sessionSeconds, sportLabel } from '../src/health/activities';
import type { TrainingSession } from '../src/repositories/activities';

const session = (overrides: Partial<TrainingSession> = {}): TrainingSession => ({ id: 'selected', physiological_date: '2026-09-08', activity_type: 'Ride', started_at: '2026-09-08T08:00:00Z', ended_at: '2026-09-08T10:00:00Z', provider: 'intervals_icu', source_device: 'device-a', source_record_id: null, external_session_id: null, distance_m: 40000, elevation_gain_m: 500, active_energy_kcal: null, avg_heart_rate_bpm: null, max_heart_rate_bpm: null, ...overrides });
describe('activity summaries and historical comparisons', () => {
  it('preserves missing values and rejects invalid numeric data', () => {
    for (const value of [null,undefined,NaN,Infinity,-1,'20']) expect(nonnegative(value)).toBeNull();
    expect(numberLabel(null,'km')).toBe('Sin dato');
    expect(nonnegative(0)).toBe(0);
  });
  it('uses the stored interval without claiming it is moving time', () => {
    expect(sessionSeconds(session())).toBe(7200);
    expect(durationLabel(7200)).toBe('2 h 0 min');
    expect(sessionSeconds(session({ended_at:'invalid'}))).toBeNull();
    expect(sessionSeconds(session({ended_at:'2026-09-08T07:00:00Z'}))).toBeNull();
  });
  it('keeps sport identities distinct', () => {
    expect(sportLabel('TrailRun')).toBe('Trail');
    expect(sportLabel('MountainBikeRide')).toBe('MTB');
    expect(sportLabel('UnknownSport')).toBe('UnknownSport');
  });
  it('excludes future, same-day, old, other sport, provider and device sessions', () => {
    const candidates = [{physiological_date:'2026-09-09'}, {physiological_date:'2026-09-08'}, {physiological_date:'2025-09-01'}, {activity_type:'MountainBikeRide'}, {provider:'other'}, {source_device:'device-b'}];
    const peers = candidates.map((o,i) => session({id:String(i),physiological_date:'2026-09-01',...o}));
    expect(activityComparison(session(),peers).count).toBe(0);
  });
  it('requires three real values for each median and excludes the selected session', () => {
    const peers = [10000,null,30000].map((distance_m,i) => session({id:String(i),physiological_date:`2026-09-0${i+1}`,distance_m}));
    const result = activityComparison(session(),[session(),...peers]);
    expect(result.count).toBe(3);
    expect(result.rows[1].median).toBeNull();
    expect(result.rows[1].count).toBe(2);
    expect(result.rows[0].median).toBe(7200);
  });
  it('calculates a historical median with no future leakage', () => {
    const peers = [10000,30000,50000,70000].map((distance_m,i) => session({id:String(i),physiological_date:`2026-09-0${i+1}`,distance_m}));
    expect(activityComparison(session(),peers).rows[1].median).toBe(40000);
  });
});
