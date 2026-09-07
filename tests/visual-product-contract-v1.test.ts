import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('visual product refinement contract', () => {
  const body = fs.readFileSync('src/components/BodyMap.tsx','utf8');
  const trends = fs.readFileSync('src/screens/Trends.tsx','utf8');
  const aging = fs.readFileSync('src/screens/Aging.tsx','utf8');

  it('keeps body motion gated by measured recent physiology', () => {
    expect(body).toContain("canAnimateBodyChannel('measured-flow'");
    expect(body).toContain('hasRecentPhysiology && !hasSourceDiscontinuity');
  });

  it('shows baseline only from stored sufficient baselines', () => {
    expect(trends).toContain('b.sufficient');
    expect(trends).toContain('chartBaselineBand');
  });

  it('does not publish a demo Pace value in Aging UI', () => {
    expect(aging).not.toContain('paceDemo');
    expect(aging).not.toContain('0.95');
    expect(aging).toContain('No publicado todavía');
  });
});
