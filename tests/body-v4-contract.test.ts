import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const body = fs.readFileSync('src/screens/Body.tsx', 'utf8');
const figure = fs.readFileSync('src/components/body/BodyFigureV4.tsx', 'utf8');
const timeline = fs.readFileSync('src/components/body/BodyTimeline.tsx', 'utf8');
const dossier = fs.readFileSync('src/components/body/BodyDossier.tsx', 'utf8');
const app = fs.readFileSync('src/app/App.tsx', 'utf8');

 describe('Body V4 organism explorer contract', () => {
  it('supports state, coverage and provenance as explicit visual modes', () => {
    expect(body).toContain("'state'");
    expect(body).toContain("'coverage'");
    expect(body).toContain("'provenance'");
  });

  it('keeps movement bound to measured evidence', () => {
    expect(figure).toContain("canAnimateBodyChannel('measured-flow'");
    expect(figure).toContain('Movimiento respaldado por señal medida');
  });

  it('makes time exploration and comparison first-class', () => {
    expect(timeline).toContain('Fijar comparación');
    expect(timeline).toContain('comparisonDate');
    expect(body).toContain('comparisonDay');
  });

  it('makes the system dossier functional rather than decorative', () => {
    expect(dossier).toContain('Resumen');
    expect(dossier).toContain('Señales');
    expect(dossier).toContain('Evidencia');
    expect(dossier).toContain('Ver evolución completa');
  });

  it('allows Body to navigate into Trends with a selected metric', () => {
    expect(app).toContain("healthos.trends.metric");
    expect(body).toContain('onOpenTrend');
  });

  it('does not introduce a synthetic resilience or body score', () => {
    expect(body.toLowerCase()).not.toContain('resilience score');
    expect(body.toLowerCase()).not.toContain('body score');
  });
});
