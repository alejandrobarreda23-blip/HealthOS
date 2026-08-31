import type {
  CaseEvaluationInput,
  DetectorCaseEvaluation,
  FindingObservation,
  ValidationCase,
} from './types';

const DAY_MS = 86_400_000;

function dateMs(date: string): number {
  return new Date(`${date}T12:00:00Z`).getTime();
}

function addDays(date: string, days: number): string {
  return new Date(dateMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((dateMs(a) - dateMs(b)) / DAY_MS);
}

function relevantDate(f: FindingObservation): string {
  return f.periodStart ?? f.detectedAt.slice(0, 10);
}

function ensureLocked(c: ValidationCase): void {
  if (c.status !== 'locked' && c.status !== 'evaluated') {
    throw new Error(`Validation case ${c.caseId} must be locked before evaluation`);
  }
  if (!c.lockedAt) {
    throw new Error(`Validation case ${c.caseId} is missing lockedAt`);
  }
}

export function evaluateDetectorCase(
  input: CaseEvaluationInput,
  detectorKey: string,
): DetectorCaseEvaluation {
  const c = input.validationCase;
  ensureLocked(c);

  const missingInputs = Object.entries(c.minimumCoverageByMetric)
    .filter(([metricKey, required]) => {
      const actual = input.metricCoverage.find(x => x.metricKey === metricKey)?.coverage ?? 0;
      return actual < required;
    })
    .map(([metricKey]) => metricKey);

  const discontinuities = input.sourceDiscontinuities.filter(d =>
    c.requireSourceContinuityForMetrics.includes(d.metricKey) && d.comparability !== 'known'
  );

  const candidates = input.findings
    .filter(f => f.findingKey === detectorKey)
    .sort((a, b) => relevantDate(a).localeCompare(relevantDate(b)));

  const evalStart = addDays(c.episodeStart, -c.evaluationWindowBeforeDays);
  const evalEnd = addDays(c.episodeEnd, c.evaluationWindowAfterDays);
  const controlBeforeStart = addDays(evalStart, -c.controlWindowDays);
  const controlAfterEnd = addDays(evalEnd, c.controlWindowDays);

  const inside = candidates.filter(f => {
    const d = relevantDate(f);
    return d >= evalStart && d <= evalEnd;
  });
  const before = candidates.filter(f => {
    const d = relevantDate(f);
    return d >= controlBeforeStart && d < evalStart;
  });
  const after = candidates.filter(f => {
    const d = relevantDate(f);
    return d > evalEnd && d <= controlAfterEnd;
  });

  const first = inside[0] ?? null;
  const detectorVersion = first?.detectorVersion ?? candidates[0]?.detectorVersion ?? null;

  if (missingInputs.length > 0 || discontinuities.length > 0) {
    return {
      caseId: c.caseId,
      detectorKey,
      detectorVersion,
      result: 'INCONCLUSIVE',
      evidenceStrength: 'INSUFFICIENT',
      dataSufficiency: 'insufficient',
      temporalAlignment: {
        insideEvaluationWindow: inside.length > 0,
        firstDetectedDate: first ? relevantDate(first) : null,
        lagDaysFromEpisodeStart: first ? diffDays(relevantDate(first), c.episodeStart) : null,
        lagDaysFromEpisodeEnd: first ? diffDays(relevantDate(first), c.episodeEnd) : null,
      },
      falsePositiveBurden: {
        activationsBefore: before.length,
        activationsAfter: after.length,
      },
      missingInputs,
      sourceDiscontinuities: discontinuities,
      interpretationBoundary: 'Insufficient data or source continuity prevents a fair retrospective judgment.',
    };
  }

  const noisy = before.length + after.length >= 3;
  const result = inside.length > 0 ? 'SUPPORTED' : 'NOT_OBSERVED';
  const evidenceStrength = inside.length === 0 ? 'LOW' : noisy ? 'LOW' : 'MODERATE';

  return {
    caseId: c.caseId,
    detectorKey,
    detectorVersion,
    result,
    evidenceStrength,
    dataSufficiency: 'sufficient',
    temporalAlignment: {
      insideEvaluationWindow: inside.length > 0,
      firstDetectedDate: first ? relevantDate(first) : null,
      lagDaysFromEpisodeStart: first ? diffDays(relevantDate(first), c.episodeStart) : null,
      lagDaysFromEpisodeEnd: first ? diffDays(relevantDate(first), c.episodeEnd) : null,
    },
    falsePositiveBurden: {
      activationsBefore: before.length,
      activationsAfter: after.length,
    },
    missingInputs,
    sourceDiscontinuities: discontinuities,
    interpretationBoundary: inside.length > 0
      ? 'Temporal and evidential compatibility supports detector behavior; causality is not established.'
      : 'No compatible detector output was observed despite sufficient declared inputs.',
  };
}
