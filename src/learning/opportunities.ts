import type{BehaviorSystemImpact,PersonalEvidenceLevel}from'./types';
export interface Opportunity{
 key:string;exposureKey:string;action:'increase'|'reduce'|'maintain'|'test';
 systems:string[];score:number;confidence:number;evidenceLevel:PersonalEvidenceLevel;reason:string;
}
export function deriveOpportunities(impacts:BehaviorSystemImpact[]):Opportunity[]{
 const byExposure=new Map<string,BehaviorSystemImpact[]>();
 for(const i of impacts)byExposure.set(i.exposureKey,[...(byExposure.get(i.exposureKey)??[]),i]);
 return[...byExposure.entries()].map(([exposure,xs])=>{
   const usable=xs.filter(x=>x.favorableImpact!=null);
   const w=usable.reduce((s,x)=>s+x.confidence,0);
   const net=w?usable.reduce((s,x)=>s+x.favorableImpact!*x.confidence,0)/w:0;
   const confidence=usable.length?usable.reduce((s,x)=>s+x.confidence,0)/usable.length:0;
   const level=usable.some(x=>x.evidenceLevel==='experiment_supported')?'experiment_supported':
     usable.some(x=>x.evidenceLevel==='strong')?'strong':
     usable.some(x=>x.evidenceLevel==='moderate')?'moderate':
     usable.some(x=>x.evidenceLevel==='exploratory')?'exploratory':'insufficient';
   const action=level==='insufficient'||confidence<.25?'test':net>.04?'increase':net<-.04?'reduce':'maintain';
   const score=Math.min(1,Math.abs(net)*confidence*2);
   return{key:`${exposure}:${action}`,exposureKey:exposure,action,systems:usable.map(x=>x.systemKey),score,confidence,evidenceLevel:level,reason:`Personal evidence across ${usable.length} system impact(s); net favorable impact ${net.toFixed(2)}.`} as Opportunity;
 }).sort((a,b)=>b.score-a.score);
}
