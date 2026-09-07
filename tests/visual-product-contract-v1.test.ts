import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('visual product refinement contract', () => {
  const figure = fs.readFileSync('src/components/body/BodyFigure.tsx','utf8');
  const trends = fs.readFileSync('src/screens/Trends.tsx','utf8');
  const aging = fs.readFileSync('src/screens/Aging.tsx','utf8');

  it('keeps body motion gated by the measured-flow contract', () => {
    expect(figure).toContain("canAnimateBodyChannel('measured-flow'");
    expect(figure).toContain('system.canAnimate');
    expect(figure).toContain('Movimiento habilitado por señal medida');
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
