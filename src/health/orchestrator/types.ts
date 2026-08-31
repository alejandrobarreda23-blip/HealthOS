export const ANALYSIS_PIPELINE_KEY = 'healthos_core_analysis';
export const ANALYSIS_PIPELINE_VERSION = 'analysis_pipeline_v1';

export const CORE_STAGE_ORDER = [
  'contract_gate',
  'daily_features',
  'baselines',
  'findings',
  'health_brief',
] as const;

export type CoreStageKey = (typeof CORE_STAGE_ORDER)[number];
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type StageStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

export interface AnalysisRunIdentity {
  userId: string;
  asOfDate: string;
  pipelineKey: string;
  pipelineVersion: string;
  inputFingerprint: string;
}

export interface AnalysisRunRecord extends AnalysisRunIdentity {
  id: string;
  status: RunStatus;
  errorStage?: CoreStageKey | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface AnalysisStageRecord {
  runId: string;
  stageKey: CoreStageKey;
  stageVersion: string;
  status: StageStatus;
  inputFingerprint?: string | null;
  outputFingerprint?: string | null;
  diagnostics?: Record<string, unknown>;
}

export interface StageResult {
  outputFingerprint?: string;
  diagnostics?: Record<string, unknown>;
}

export interface StageContext {
  run: AnalysisRunRecord;
  userId: string;
  asOfDate: string;
}

export type StageRunner = (context: StageContext) => Promise<StageResult>;

export interface StageDefinition {
  key: CoreStageKey;
  version: string;
  run: StageRunner;
}

export interface OrchestratorStore {
  startOrResumeRun(identity: AnalysisRunIdentity): Promise<AnalysisRunRecord>;
  getStages(runId: string): Promise<AnalysisStageRecord[]>;
  markRunRunning(runId: string): Promise<void>;
  markRunSucceeded(runId: string): Promise<void>;
  markRunFailed(
    runId: string,
    error: { stage: CoreStageKey; code: string; message: string },
  ): Promise<void>;
  markStageRunning(input: {
    runId: string;
    stageKey: CoreStageKey;
    stageVersion: string;
    inputFingerprint: string;
  }): Promise<void>;
  markStageSucceeded(input: {
    runId: string;
    stageKey: CoreStageKey;
    stageVersion: string;
    inputFingerprint: string;
    outputFingerprint?: string;
    diagnostics?: Record<string, unknown>;
  }): Promise<void>;
  markStageFailed(input: {
    runId: string;
    stageKey: CoreStageKey;
    stageVersion: string;
    inputFingerprint: string;
    code: string;
    message: string;
  }): Promise<void>;
  publish(runId: string): Promise<void>;
}

export interface AnalysisPipelineRequest {
  userId: string;
  asOfDate: string;
  inputFingerprint: string;
}

export interface AnalysisPipelineResult {
  runId: string;
  status: 'succeeded';
  reusedCompletedStages: CoreStageKey[];
  executedStages: CoreStageKey[];
}
