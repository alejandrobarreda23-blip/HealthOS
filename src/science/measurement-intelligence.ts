import type{MeasurementCandidate}from'./types';const c=(x:number)=>Math.max(0,Math.min(1,x));
export function measurementPriority(m:MeasurementCandidate){return c(.48*m.informationGain+.27*m.evidenceMaturity+.25*(m.clinicalUtilityEstablished?1:.55)-.30*m.invasiveness-.28*(m.radiation?1:0)-.18*m.burden)}
export const rankMeasurements=(xs:MeasurementCandidate[])=>[...xs].map(x=>({...x,priority:measurementPriority(x)})).sort((a,b)=>b.priority-a.priority);
