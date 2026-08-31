import type{AcquisitionCandidate}from'./types';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
/** ACQ-06. Ranking aid only; it does not authorize acquisition or a medical conclusion. */
export function acquisitionPriority(x:AcquisitionCandidate){
 const value=clamp(x.informationValue)*clamp(x.reliability)*clamp(x.physiologicalRelevance);
 return value/(.15+clamp(x.burden));
}
export function rankAcquisitionCandidates(xs:AcquisitionCandidate[]){
 return[...xs].map(x=>({...x,priority:acquisitionPriority(x)})).sort((a,b)=>b.priority-a.priority);
}
