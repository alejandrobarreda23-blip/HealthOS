import { describe, expect, it } from 'vitest';
import { evaluateDetectorCase } from '../src/health/validation/evaluator';
import type { ValidationCase } from '../src/health/validation/types';

const lockedCase: ValidationCase = {
  caseId: 'T-001',
  title: 'Locked episode',
  status: 'locked',
  datasetRole: 'validation',
  episodeStart: '2026-08-10',
  episodeEnd: '2026-08-12',
  evaluationWindowBeforeDays: 1,
  evaluationWindowAfterDays: 4,
  controlWindowDays: 7,
  knownFacts: [],
  expectedObservables: [],
  excludedClaims: [],
  relevantMetrics: ['hrv_rmssd'],
  relevantFindings: ['sustained_hrv_drop'],
  minimumCoverageByMetric: { hrv_rmssd: 0.5 },
  confounders: [],
  requireSourceContinuityForMetrics: ['hrv_rmssd'],
  caseVersion: '1.0.0',
  lockedAt: '2026-08-30T15:00:00Z',
};

describe('retrospective validation', () => {
  it('rejects an unlocked case', () => {
    expect(() => evaluateDetectorCase({
      validationCase: { ...lockedCase, status: 'draft', lockedAt: undefined },
      findings: [],
      metricCoverage: [],
      sourceDiscontinuities: [],
    }, 'sustained_hrv_drop')).toThrow(/locked/);
  });

  it('returns INCONCLUSIVE when data coverage is insufficient', () => {
    const result = evaluateDetectorCase({
      validationCase: lockedCase,
      findings: [],
      metricCoverage: [{ metricKey: 'hrv_rmssd', coverage: 0.2 }],
      sourceDiscontinuities: [],
    }, 'sustained_hrv_drop');

    expect(result.result).toBe('INCONCLUSIVE');
    expect(result.evidenceStrength).toBe('INSUFFICIENT');
  });

  it('returns SUPPORTED for temporally compatible finding with sufficient data', () => {
    const result = evaluateDetectorCase({
      validationCase: lockedCase,
      findings: [{
        findingKey: 'sustained_hrv_drop',
        detectorVersion: '2.0.0',
        detectedAt: '2026-08-14T08:00:00Z',
        periodStart: '2026-08-13',
      }],
      metricCoverage: [{ metricKey: 'hrv_rmssd', coverage: 0.9 }],
      sourceDiscontinuities: [],
    }, 'sustained_hrv_drop');

    expect(result.result).toBe('SUPPORTED');
    expect(result.detectorVersion).toBe('2.0.0');
  });

  it('propagates unknown source discontinuity as INCONCLUSIVE', () => {
    const result = evaluateDetectorCase({
      validationCase: lockedCase,
      findings: [],
      metricCoverage: [{ metricKey: 'hrv_rmssd', coverage: 0.9 }],
      sourceDiscontinuities: [{ metricKey: 'hrv_rmssd', date: '2026-08-11', comparability: 'unknown' }],
    }, 'sustained_hrv_drop');

    expect(result.result).toBe('INCONCLUSIVE');
  });

  it('records false-positive neighborhood separately', () => {
    const result = evaluateDetectorCase({
      validationCase: lockedCase,
      findings: [
        { findingKey: 'sustained_hrv_drop', detectorVersion: '2', detectedAt: '2026-08-05T08:00:00Z' },
        { findingKey: 'sustained_hrv_drop', detectorVersion: '2', detectedAt: '2026-08-13T08:00:00Z' },
        { findingKey: 'sustained_hrv_drop', detectorVersion: '2', detectedAt: '2026-08-20T08:00:00Z' },
      ],
      metricCoverage: [{ metricKey: 'hrv_rmssd', coverage: 0.9 }],
      sourceDiscontinuities: [],
    }, 'sustained_hrv_drop');

    expect(result.falsePositiveBurden.activationsBefore).toBe(1);
    expect(result.falsePositiveBurden.activationsAfter).toBe(1);
  });
});
