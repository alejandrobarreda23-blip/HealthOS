import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/health/maturity/policy';
import type { EvidenceRecord } from '../src/health/maturity/types';

const base = {
  componentKey: 'detector:sustained_hrv_drop',
  componentVersion: '2.0.0',
  componentClass: 'detector' as const,
};

function ev(partial: Partial<EvidenceRecord> & Pick<EvidenceRecord, 'evidenceId' | 'evidenceType'>): EvidenceRecord {
  return {
    ...base,
    status: 'accepted',
    observedAt: '2026-08-30T12:00:00Z',
    actor: 'ci',
    ...partial,
  };
}

describe('maturity policy', () => {
  it('does not confuse CI success with retrospective support', () => {
    const evidence = [ev({ evidenceId: '1', evidenceType: 'CI_RUN' })];
    const d = canTransition('detector', base.componentKey, base.componentVersion, 'IMPLEMENTED', 'RETROSPECTIVELY_SUPPORTED', evidence);
    expect(d.ok).toBe(false);
    expect(d.missingEvidenceTypes).toContain('RETROSPECTIVE_CASE');
  });

  it('requires run id and fingerprint for real-data execution', () => {
    const evidence = [ev({ evidenceId: '1', evidenceType: 'REAL_DATA_RUN', actor: 'runtime' })];
    const d = canTransition('detector', base.componentKey, base.componentVersion, 'TECHNICALLY_VERIFIED', 'REAL_DATA_EXECUTED', evidence);
    expect(d.ok).toBe(false);
  });

  it('accepts a supported retrospective case for same component version', () => {
    const evidence = [ev({
      evidenceId: '1',
      evidenceType: 'RETROSPECTIVE_CASE',
      actor: 'validation_harness',
      caseId: 'RV-001',
      caseVersion: '1',
      result: { evaluation: 'SUPPORTED' },
    })];
    const d = canTransition('detector', base.componentKey, base.componentVersion, 'REAL_DATA_EXECUTED', 'RETROSPECTIVELY_SUPPORTED', evidence);
    expect(d.ok).toBe(true);
  });

  it('prevents UI components from claiming retrospective physiological support', () => {
    const evidence = [ev({
      evidenceId: '1',
      evidenceType: 'RETROSPECTIVE_CASE',
      actor: 'validation_harness',
      caseId: 'RV-001',
      caseVersion: '1',
      result: { evaluation: 'SUPPORTED' },
      componentKey: 'ui:today',
      componentVersion: '2.0.0',
      componentClass: 'ui_consumer',
    })];
    const d = canTransition('ui_consumer', 'ui:today', '2.0.0', 'REAL_DATA_EXECUTED', 'RETROSPECTIVELY_SUPPORTED', evidence);
    expect(d.ok).toBe(false);
  });

  it('terminal states cannot silently reactivate', () => {
    const evidence = [ev({ evidenceId: '1', evidenceType: 'CI_RUN' })];
    const d = canTransition('detector', base.componentKey, base.componentVersion, 'SUPERSEDED', 'TECHNICALLY_VERIFIED', evidence);
    expect(d.ok).toBe(false);
  });
});
