import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { findingSystem } from '../src/body/view-state';

const screen = fs.readFileSync('src/screens/Body.tsx', 'utf8');
const figure = fs.readFileSync('src/components/body/BodyFigure.tsx', 'utf8');
const timeline = fs.readFileSync('src/components/body/BodyTimeline.tsx', 'utf8');
const history = fs.readFileSync('src/repositories/body-history.ts', 'utf8');

describe('Body V3 product/epistemic contract', () => {
  it('reads historical physiology from normalized observations instead of inventing interpolation', () => {
    expect(history).toContain(".from('observations')");
    expect(history).toContain(".from('exercise_sessions')");
    expect(timeline).toContain("className={`${day ? 'has-data' : 'gap'}");
  });

  it('keeps historical findings unreconstructed rather than projecting current findings backwards', () => {
    expect(screen).toContain('Los hallazgos históricos no se recalculan ni se proyectan retrospectivamente');
  });

  it('uses fog as missingness and amber only as an evidence beacon', () => {
    expect(figure).toContain('data-visual-meaning="missing-fog"');
    expect(figure).toContain('data-visual-meaning="active-finding"');
    expect(figure).toContain('bodyV3FindingBeacon');
  });

  it('maps data-quality findings to no anatomical system', () => {
    expect(findingSystem({
      findingKey: 'insufficient_recent_data',
      domain: 'data_quality',
      title: 'Datos recientes insuficientes',
      summary: 'Cobertura insuficiente',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-07',
      severity: 'info',
      evidenceStrength: 'HIGH',
      detectorVersion: 'insufficient_recent_data_v1',
      inputMetrics: [],
      sampleCount: 0,
      coverage: 0,
      evidence: {},
      confounders: [],
      interpretationBoundary: 'calidad de datos',
    })).toBeNull();
  });
});
