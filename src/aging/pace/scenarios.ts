import type{PaceSystemInput}from'./types';import{calculateExperimentalPace}from'./engine';

export interface InterventionScenario{
 key:string;label:string;
 deltas:Record<string,number>; // hypothetical system-signal delta, not causal effect
 evidenceLevel:'illustrative'|'association_supported'|'experiment_supported';
}

export function simulateScenario(base:PaceSystemInput[],scenario:InterventionScenario){
 const adjusted=base.map(s=>({...s,signal:s.signal==null?null:Math.max(-1,Math.min(1,s.signal+(scenario.deltas[s.systemKey]??0)))}));
 return{scenario,result:calculateExperimentalPace(adjusted),
 caveat:'Scenario projection is sensitivity analysis, not a causal or lifespan prediction.'};
}
