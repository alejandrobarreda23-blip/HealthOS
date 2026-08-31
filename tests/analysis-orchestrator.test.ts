import { describe, expect, it } from 'vitest';
import { runAnalysisPipelineV1 } from '../src/health/orchestrator/orchestrator';
import { CORE_STAGE_VERSIONS } from '../src/health/orchestrator/stage-versions';
import type {
  AnalysisRunRecord,
  AnalysisStageRecord,
  CoreStageKey,
  OrchestratorStore,
  StageDefinition,
} from '../src/health/orchestrator/types';

function memoryStore(seedStages: AnalysisStageRecord[] = []) {
  const run: AnalysisRunRecord = {
    id: 'run-1', userId: 'user-1', asOfDate: '2026-08-30',
    pipelineKey: 'healthos_core_analysis', pipelineVersion: 'analysis_pipeline_v1',
    inputFingerprint: 'fp-1', status: 'queued',
  };
  const stages = [...seedStages];
  const log: string[] = [];
  let published = false;

  const store: OrchestratorStore = {
    async startOrResumeRun() { return run; },
    async getStages() { return stages; },
    async markRunRunning() { run.status = 'running'; log.push('run:running'); },
    async markRunSucceeded() { run.status = 'succeeded'; log.push('run:succeeded'); },
    async markRunFailed(_id, e) { run.status = 'failed'; log.push(`run:failed:${e.stage}`); },
    async markStageRunning(x) { log.push(`${x.stageKey}:running`); },
    async markStageSucceeded(x) {
      log.push(`${x.stageKey}:succeeded`);
      stages.push({ runId: run.id, stageKey: x.stageKey, stageVersion: x.stageVersion, status: 'succeeded', inputFingerprint: x.inputFingerprint });
    },
    async markStageFailed(x) { log.push(`${x.stageKey}:failed`); },
    async publish() { published = true; log.push('published'); },
  };
  return { store, run, log, get published() { return published; } };
}

function definitions(failAt?: CoreStageKey): StageDefinition[] {
  const order: CoreStageKey[] = ['contract_gate','daily_features','baselines','findings','health_brief'];
  return order.map((key) => ({
    key,
    version: CORE_STAGE_VERSIONS[key],
    run: async () => {
      if (key === failAt) throw new Error(`boom:${key}`);
      return { diagnostics: { ok: true } };
    },
  }));
}

describe('Analysis Orchestrator V1', () => {
  it('executes the strict DAG and publishes only after success', async () => {
    const mem = memoryStore();
    const result = await runAnalysisPipelineV1({
      request: { userId: 'user-1', asOfDate: '2026-08-30', inputFingerprint: 'fp-1' },
      store: mem.store,
      stages: definitions(),
    });
    expect(result.executedStages).toEqual(['contract_gate','daily_features','baselines','findings','health_brief']);
    expect(mem.published).toBe(true);
    expect(mem.log.at(-1)).toBe('published');
  });

  it('stops downstream execution and does not publish after failure', async () => {
    const mem = memoryStore();
    await expect(runAnalysisPipelineV1({
      request: { userId: 'user-1', asOfDate: '2026-08-30', inputFingerprint: 'fp-1' },
      store: mem.store,
      stages: definitions('findings'),
    })).rejects.toThrow('boom:findings');
    expect(mem.log).not.toContain('health_brief:running');
    expect(mem.published).toBe(false);
    expect(mem.run.status).toBe('failed');
  });

  it('reuses a succeeded stage only when stage version and input fingerprint match', async () => {
    const mem = memoryStore([{
      runId: 'run-1', stageKey: 'contract_gate', stageVersion: CORE_STAGE_VERSIONS.contract_gate,
      status: 'succeeded', inputFingerprint: 'fp-1',
    }]);
    const result = await runAnalysisPipelineV1({
      request: { userId: 'user-1', asOfDate: '2026-08-30', inputFingerprint: 'fp-1' },
      store: mem.store,
      stages: definitions(),
    });
    expect(result.reusedCompletedStages).toEqual(['contract_gate']);
    expect(mem.log).not.toContain('contract_gate:running');
  });

  it('does not reuse a succeeded stage from a different input fingerprint', async () => {
    const mem = memoryStore([{
      runId: 'run-1', stageKey: 'contract_gate', stageVersion: CORE_STAGE_VERSIONS.contract_gate,
      status: 'succeeded', inputFingerprint: 'old-fp',
    }]);
    await runAnalysisPipelineV1({
      request: { userId: 'user-1', asOfDate: '2026-08-30', inputFingerprint: 'fp-1' },
      store: mem.store,
      stages: definitions(),
    });
    expect(mem.log).toContain('contract_gate:running');
  });

  it('rejects a reordered core graph before execution', async () => {
    const mem = memoryStore();
    const bad = definitions();
    [bad[1], bad[2]] = [bad[2], bad[1]];
    await expect(runAnalysisPipelineV1({
      request: { userId: 'user-1', asOfDate: '2026-08-30', inputFingerprint: 'fp-1' },
      store: mem.store,
      stages: bad,
    })).rejects.toThrow('Invalid core stage graph');
    expect(mem.log).toEqual([]);
  });
});
