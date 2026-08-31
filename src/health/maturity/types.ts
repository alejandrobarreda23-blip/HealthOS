export type MaturityState =
  | 'SPEC'
  | 'IMPLEMENTED'
  | 'TECHNICALLY_VERIFIED'
  | 'REAL_DATA_EXECUTED'
  | 'RETROSPECTIVELY_SUPPORTED'
  | 'PROSPECTIVELY_SUPPORTED'
  | 'SUPERSEDED'
  | 'RETIRED';

export type ComponentClass =
  | 'metric_definition'
  | 'feature_definition'
  | 'connector'
  | 'normalizer'
  | 'pipeline'
  | 'detector'
  | 'baseline_algorithm'
  | 'health_brief'
  | 'ui_consumer'
  | 'experiment_protocol'
  | 'scientific_rule';

export type EvidenceType =
  | 'SPEC_DOCUMENT'
  | 'REPO_ARTIFACT'
  | 'CI_RUN'
  | 'MIGRATION_CHECK'
  | 'CONTRACT_TEST'
  | 'UNIT_TEST'
  | 'INTEGRATION_TEST'
  | 'BUILD'
  | 'REAL_DATA_RUN'
  | 'RETROSPECTIVE_CASE'
  | 'PROSPECTIVE_CASE'
  | 'SOURCE_CONTINUITY_CHECK'
  | 'DATA_QUALITY_CHECK'
  | 'HUMAN_REVIEW'
  | 'DEPRECATION_NOTICE';

export interface ComponentIdentity {
  componentKey: string;
  componentVersion: string;
  componentClass: ComponentClass;
}

export interface EvidenceRecord extends ComponentIdentity {
  evidenceId: string;
  evidenceType: EvidenceType;
  status: 'accepted' | 'rejected' | 'superseded';
  observedAt: string;
  actor: 'ci' | 'runtime' | 'human' | 'validation_harness' | 'migration';
  sourceRef?: string;
  inputFingerprint?: string;
  runId?: string;
  caseId?: string;
  caseVersion?: string;
  result?: Record<string, unknown>;
  notes?: string;
}

export interface MaturityTransition extends ComponentIdentity {
  transitionId: string;
  fromState: MaturityState | null;
  toState: MaturityState;
  evidenceIds: string[];
  decidedAt: string;
  decidedBy: 'policy_engine' | 'human_review';
  reason?: string;
}

export interface TransitionDecision {
  ok: boolean;
  missingEvidenceTypes: EvidenceType[];
  errors: string[];
}
