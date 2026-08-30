import type { RawSourceRecord } from '../connectors/connector';
import type { Normalizer, NormalizedObservation } from './types';
import { healthConnectNormalizers } from './health-connect';

const normalizers:Normalizer[]=[...healthConnectNormalizers];
export function registerNormalizer(n:Normalizer){normalizers.push(n)}
export function normalizeRecord(r:RawSourceRecord):NormalizedObservation[]{const n=normalizers.find(x=>x.supports(r));return n?n.normalize(r):[]}
export function registeredNormalizerCount(){return normalizers.length}
