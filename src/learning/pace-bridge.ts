import type{PaceSystemInput}from'../aging/pace/types';import type{BehaviorSystemImpact}from'./types';
/**
 * Personal behavior evidence may inform a scenario, but NEVER silently rewrites the observed Pace.
 * This function returns a separate counterfactual/sensitivity input set.
 */
export function behaviorScenario(base:PaceSystemInput[],impacts:BehaviorSystemImpact[],exposureKey:string){
 const selected=impacts.filter(i=>i.exposureKey===exposureKey&&i.favorableImpact!=null);
 return base.map(s=>{
   const xs=selected.filter(i=>i.systemKey===s.systemKey);
   if(!xs.length||s.signal==null)return{...s};
   const delta=xs.reduce((sum,x)=>sum+x.favorableImpact!*x.confidence,0)/xs.length;
   return{...s,signal:Math.max(-1,Math.min(1,s.signal+delta*.20))};
 });
}
