import type { RawSourceRecord } from '../connectors/connector';

export interface NormalizedObservation {
  metricKey:string;
  valueNumeric?:number;
  valueText?:string;
  valueBoolean?:boolean;
  unit?:string;
  startedAt:string;
  endedAt?:string;
  timezone?:string;
  physiologicalDate:string;
  assignmentRule:string;
  provider:string;
  sourceType:string;
  sourceDevice?:string;
  measurementMethod?:string;
  dataLevel:'measured'|'derived'|'reported'|'inferred';
  qualityScore?:number;
  externalObservationId?:string;
  normalizerVersion:string;
}

export interface Normalizer {
  supports(record:RawSourceRecord):boolean;
  normalize(record:RawSourceRecord):NormalizedObservation[];
}
