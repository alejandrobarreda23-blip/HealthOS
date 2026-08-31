import type {
  ComponentClass,
  EvidenceRecord,
  EvidenceType,
  MaturityState,
  TransitionDecision,
} from './types';

const required: Partial<Record<MaturityState, EvidenceType[]>> = {
  IMPLEMENTED: ['SPEC_DOCUMENT', 'REPO_ARTIFACT'],
  TECHNICALLY_VERIFIED: ['CI_RUN'],
  REAL_DATA_EXECUTED: ['REAL_DATA_RUN'],
  RETROSPECTIVELY_SUPPORTED: ['RETROSPECTIVE_CASE'],
  PROSPECTIVELY_SUPPORTED: ['PROSPECTIVE_CASE'],
  SUPERSEDED: ['DEPRECATION_NOTICE'],
  RETIRED: ['DEPRECATION_NOTICE'],
};

const empiricalClasses = new Set<ComponentClass>([
  'detector',
  'baseline_algorithm',
  'experiment_protocol',
  'scientific_rule',
]);

export function canTransition(
  componentClass: ComponentClass,
  componentKey: string,
  componentVersion: string,
  fromState: MaturityState | null,
  toState: MaturityState,
  evidence: EvidenceRecord[],
): TransitionDecision {
  const accepted = evidence.filter(
    (e) =>
      e.status === 'accepted' &&
      e.componentKey === componentKey &&
      e.componentVersion === componentVersion,
  );

  const errors: string[] = [];

  if (
    (toState === 'RETROSPECTIVELY_SUPPORTED' ||
      toState === 'PROSPECTIVELY_SUPPORTED') &&
    !empiricalClasses.has(componentClass)
  ) {
    errors.push(`${componentClass} does not use empirical maturity state ${toState}`);
  }

  if (toState === 'REAL_DATA_EXECUTED') {
    const realRuns = accepted.filter((e) => e.evidenceType === 'REAL_DATA_RUN');
    if (!realRuns.some((e) => e.runId && e.inputFingerprint)) {
      errors.push('REAL_DATA_RUN requires runId and inputFingerprint');
    }
  }

  if (toState === 'RETROSPECTIVELY_SUPPORTED') {
    const cases = accepted.filter((e) => e.evidenceType === 'RETROSPECTIVE_CASE');
    if (!cases.some((e) => e.caseId && e.caseVersion && e.result?.evaluation === 'SUPPORTED')) {
      errors.push('No accepted locked retrospective case supports this version');
    }
  }

  if (toState === 'PROSPECTIVELY_SUPPORTED') {
    const cases = accepted.filter((e) => e.evidenceType === 'PROSPECTIVE_CASE');
    if (!cases.some((e) => e.caseId && e.caseVersion && e.result?.evaluation === 'SUPPORTED')) {
      errors.push('No accepted prospective case supports this version');
    }
  }

  const needed = required[toState] ?? [];
  const present = new Set(accepted.map((e) => e.evidenceType));
  const missingEvidenceTypes = needed.filter((x) => !present.has(x));

  if (fromState === 'SUPERSEDED' || fromState === 'RETIRED') {
    errors.push(`Terminal maturity state ${fromState} cannot transition forward`);
  }

  return {
    ok: errors.length === 0 && missingEvidenceTypes.length === 0,
    missingEvidenceTypes,
    errors,
  };
}
