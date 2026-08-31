import {
  ANALYSIS_PIPELINE_KEY,
  ANALYSIS_PIPELINE_VERSION,
  CORE_STAGE_ORDER,
  type AnalysisPipelineRequest,
  type AnalysisPipelineResult,
  type AnalysisStageRecord,
  type CoreStageKey,
  type OrchestratorStore,
  type StageDefinition,
} from './types';

export class AnalysisPipelineError extends Error {
  constructor(
    public readonly stage: CoreStageKey,
    public readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'AnalysisPipelineError';
  }
}

function assertStageGraph(stages: StageDefinition[]): void {
  const actual = stages.map((s) => s.key);
  if (
    actual.length !== CORE_STAGE_ORDER.length ||
    actual.some((key, i) => key !== CORE_STAGE_ORDER[i])
  ) {
    throw new Error(
      `Invalid core stage graph. Expected ${CORE_STAGE_ORDER.join(' -> ')}, got ${actual.join(' -> ')}`,
    );
  }
  for (const stage of stages) {
    if (!stage.version.trim()) throw new Error(`Stage ${stage.key} has no version`);
  }
}

function stageMap(rows: AnalysisStageRecord[]): Map<CoreStageKey, AnalysisStageRecord> {
  return new Map(rows.map((row) => [row.stageKey, row]));
}

function errorCodeFor(stage: CoreStageKey): string {
  switch (stage) {
    case 'contract_gate': return 'CONTRACT_VIOLATION';
    case 'daily_features': return 'DAILY_FEATURES_FAILED';
    case 'baselines': return 'BASELINE_FAILED';
    case 'findings': return 'FINDING_FAILED';
    case 'health_brief': return 'HEALTH_BRIEF_FAILED';
  }
}

export async function runAnalysisPipelineV1(input: {
  request: AnalysisPipelineRequest;
  store: OrchestratorStore;
  stages: StageDefinition[];
}): Promise<AnalysisPipelineResult> {
  const { request, store, stages } = input;
  assertStageGraph(stages);

  if (!request.userId) throw new Error('Authenticated user required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.asOfDate)) throw new Error('asOfDate must be YYYY-MM-DD');
  if (!request.inputFingerprint.trim()) throw new Error('inputFingerprint is required');

  const run = await store.startOrResumeRun({
    userId: request.userId,
    asOfDate: request.asOfDate,
    pipelineKey: ANALYSIS_PIPELINE_KEY,
    pipelineVersion: ANALYSIS_PIPELINE_VERSION,
    inputFingerprint: request.inputFingerprint,
  });

  const existing = stageMap(await store.getStages(run.id));
  const reusedCompletedStages: CoreStageKey[] = [];
  const executedStages: CoreStageKey[] = [];

  await store.markRunRunning(run.id);

  for (const stage of stages) {
    const previous = existing.get(stage.key);
    const canReuse =
      previous?.status === 'succeeded' &&
      previous.stageVersion === stage.version &&
      previous.inputFingerprint === request.inputFingerprint;

    if (canReuse) {
      reusedCompletedStages.push(stage.key);
      continue;
    }

    await store.markStageRunning({
      runId: run.id,
      stageKey: stage.key,
      stageVersion: stage.version,
      inputFingerprint: request.inputFingerprint,
    });

    try {
      const result = await stage.run({
        run,
        userId: request.userId,
        asOfDate: request.asOfDate,
      });

      await store.markStageSucceeded({
        runId: run.id,
        stageKey: stage.key,
        stageVersion: stage.version,
        inputFingerprint: request.inputFingerprint,
        outputFingerprint: result.outputFingerprint,
        diagnostics: result.diagnostics,
      });
      executedStages.push(stage.key);
    } catch (cause) {
      const code = cause instanceof AnalysisPipelineError
        ? cause.code
        : errorCodeFor(stage.key);
      const message = cause instanceof Error ? cause.message : String(cause);

      await store.markStageFailed({
        runId: run.id,
        stageKey: stage.key,
        stageVersion: stage.version,
        inputFingerprint: request.inputFingerprint,
        code,
        message,
      });
      await store.markRunFailed(run.id, { stage: stage.key, code, message });

      throw new AnalysisPipelineError(stage.key, code, message, { cause });
    }
  }

  await store.markRunSucceeded(run.id);
  try {
    await store.publish(run.id);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await store.markRunFailed(run.id, {
      stage: 'health_brief',
      code: 'PUBLICATION_FAILED',
      message,
    });
    throw new AnalysisPipelineError('health_brief', 'PUBLICATION_FAILED', message, { cause });
  }

  return {
    runId: run.id,
    status: 'succeeded',
    reusedCompletedStages,
    executedStages,
  };
}
