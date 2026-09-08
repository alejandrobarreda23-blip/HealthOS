import { describe, expect, it } from 'vitest';
import {
  VISIBLE_AGING_PHOTO_PROTOCOL_V1,
  daysUntilVisibleAgingCampaign,
  visibleAgingDomains,
  type PassiveVisibleAgingContext,
  type VisibleAgingPhotoSession,
} from '../src/aging/visible-aging';

const passive: PassiveVisibleAgingContext = {
  overallCoverage: 0.8,
  hrv: null,
  restingHr: null,
  sleep: null,
  weightKg: null,
  trainingSessions7d: 0,
};

function session(capturedAt: string): VisibleAgingPhotoSession {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    capturedAt,
    protocolVersion: '1.0.0',
    protocolSnapshot: {},
    status: 'complete',
    frontPath: 'front.jpg',
    obliquePath: '45.jpg',
    profilePath: 'profile.jpg',
    quality: {},
    createdAt: capturedAt,
  };
}

describe('Visible Aging V1 contracts', () => {
  it('uses a low-frequency photo campaign', () => {
    expect(VISIBLE_AGING_PHOTO_PROTOCOL_V1.cadenceDays).toBeGreaterThanOrEqual(42);
    expect(VISIBLE_AGING_PHOTO_PROTOCOL_V1.estimatedSeconds).toBeLessThanOrEqual(120);
    expect(VISIBLE_AGING_PHOTO_PROTOCOL_V1.poses).toHaveLength(3);
  });

  it('does not claim trajectory from a single visual campaign', () => {
    const domains = visibleAgingDomains([session('2026-09-01T09:00:00Z')], [], passive);
    expect(domains.find((x) => x.key === 'skin')?.acquisition).toBe('baseline');
    expect(domains.find((x) => x.key === 'face')?.acquisition).toBe('baseline');
  });

  it('allows descriptive trajectory only after repeated campaigns', () => {
    const domains = visibleAgingDomains(
      [session('2026-09-01T09:00:00Z'), session('2026-07-01T09:00:00Z')],
      [],
      passive,
    );
    expect(domains.find((x) => x.key === 'skin')?.acquisition).toBe('trajectory');
  });

  it('does not ask for another campaign before cadence is reached', () => {
    const days = daysUntilVisibleAgingCampaign(
      session('2026-09-01T09:00:00Z'),
      new Date('2026-09-08T12:00:00Z'),
    );
    expect(days).toBe(VISIBLE_AGING_PHOTO_PROTOCOL_V1.cadenceDays - 7);
  });
});
