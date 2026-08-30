import type { HealthConnector } from '../connectors/connector';
import { persistRawRecords } from './ingestion';

/**
 * Stage 1 only: connector -> immutable raw store.
 * Normalization/reconciliation run as separate retryable stages.
 */
export async function syncConnector(userId:string, connector:HealthConnector, cursor?:string){
  if(!(await connector.isAvailable())) throw new Error(`${connector.displayName} is unavailable`);
  const result=await connector.sync({cursor});
  const persisted=await persistRawRecords(userId,result.records);
  return {received:result.records.length,persisted:persisted?.length ?? 0,cursor:result.cursor};
}
