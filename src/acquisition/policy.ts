import type{AcquisitionCandidate,ManualBurden,MeasurementMode,LongitudinalRole}from'./types';

const clamp=(x:number)=>Math.max(0,Math.min(1,x));

/**
 * ACQ-06 ranking aid only. These are operational weights, not probabilities,
 * clinical evidence grades or medical recommendations.
 */
export function acquisitionPriority(x:AcquisitionCandidate){
 const value=clamp(x.informationValue)*clamp(x.reliability)*clamp(x.physiologicalRelevance);
 return value/(.15+clamp(x.burden));
}

export function rankAcquisitionCandidates(xs:AcquisitionCandidate[]){
 return[...xs]
  .map(x=>({...x,priority:acquisitionPriority(x)}))
  .sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key));
}

export function burdenWeight(x:ManualBurden){
 return({none:0,very_low:.12,low:.28,moderate:.58,high:.9}as const)[x];
}

/** Product-policy weight used only to rank acquisition gaps. */
export function modeReliabilityWeight(x:MeasurementMode){
 return({
  passive_continuous:.80,
  passive_daily:.80,
  home_periodic:.88,
  episodic_protocol:.90,
  laboratory_periodic:.94,
  clinical_episodic:.94,
  manual_contextual:.55
 }as const)[x];
}

/** Product-policy relevance weight. It does not quantify biological importance. */
export function roleRelevanceWeight(xs:LongitudinalRole[]){
 if(xs.includes('trajectory'))return .90;
 if(xs.includes('state'))return .86;
 if(xs.includes('dynamics'))return .84;
 if(xs.includes('adaptation'))return .80;
 if(xs.includes('context'))return .55;
 return .50;
}
