export type ValidationCaseStatus = 'draft' | 'locked' | 'evaluated' | 'retired';
export type ValidationDatasetRole = 'development' | 'validation' | 'holdout';
export type ValidationResult = 'SUPPORTED' | 'NOT_OBSERVED' | 'INCONCLUSIVE' | 'CONTRADICTED';
export type EvidenceStrength = 'INSUFFICIENT' | 'LOW' | 'MODERATE' | 'HIGH';

export interface KnownFact {
  key: string;
  description: string;
  source: 'user_reported' | 'exercise_history' | 'medical_record' | 'system_record';
  evidenceRef?: string;
}

export interface ExpectedObservable {
  metricKey: string;
  direction: 'increase' | 'decrease' | 'deviation' | 'present' | 'absent';
  horizon: 'during' | 'after' | 'during_or_after';
  required: boolean;
  rationale: string;
}

export interface ValidationCase {
  caseId: string;
  title: string;
  status: ValidationCaseStatus;
  datasetRole: ValidationDatasetRole;
  episodeStart: string;
  episodeEnd: string;
  evaluationWindowBeforeDays: number;
  evaluationWindowAfterDays: number;
  controlWindowDays: number;
  knownFacts: KnownFact[];
  expectedObservables: ExpectedObservable[];
  excludedClaims: string[];
  relevantMetrics: string[];
  relevantFindings: string[];
  minimumCoverageByMetric: Record<string, number>;
  confounders: string[];
  requireSourceContinuityForMetrics: string[];
  caseVersion: string;
  lockedAt?: string;
}

export interface FindingObservation {
  findingKey: string;
  detectorVersion: string;
  periodStart?: string;
  periodEnd?: string;
  detectedAt: string;
  evidenceStrength?: EvidenceStrength;
}

export interface MetricCoverage {
  metricKey: string;
  coverage: number;
}

export interface SourceDiscontinuity {
  metricKey: string;
  date: string;
  comparability: 'known' | 'unknown' | 'not_comparable';
}

export interface CaseEvaluationInput {
  validationCase: ValidationCase;
  findings: FindingObservation[];
  metricCoverage: MetricCoverage[];
  sourceDiscontinuities: SourceDiscontinuity[];
}

export interface DetectorCaseEvaluation {
  caseId: string;
  detectorKey: string;
  detectorVersion: string | null;
  result: ValidationResult;
  evidenceStrength: EvidenceStrength;
  dataSufficiency: 'sufficient' | 'insufficient';
  temporalAlignment: {
    insideEvaluationWindow: boolean;
    firstDetectedDate: string | null;
    lagDaysFromEpisodeStart: number | null;
    lagDaysFromEpisodeEnd: number | null;
  };
  falsePositiveBurden: {
    activationsBefore: number;
    activationsAfter: number;
  };
  missingInputs: string[];
  sourceDiscontinuities: SourceDiscontinuity[];
  interpretationBoundary: string;
}
