import type{PaceResult,PaceSystemInput,PaceContribution}from'./types';

const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const MODEL={
 minDays:365,minSystems:4,minDomains:4,minCoverage:.70,
 shrinkage:.60,domainCap:.30,signalCap:.50,
 version:'healthos-pace-framework-v1'
};

/**
 * Experimental framework.
 * It intentionally does NOT claim that 0.8 means "0.8 biological years/year".
 * 1.0 is only an internal neutral anchor until external calibration exists.
 */
export function calculateExperimentalPace(inputs:PaceSystemInput[]):PaceResult{
 const excluded:Record<string,string>={};
 const eligible=inputs.filter(x=>{
   if(x.signal==null){excluded[x.systemKey]='missing_signal';return false}
   if(x.coverage<.50){excluded[x.systemKey]='low_coverage';return false}
   if(x.confidence<.45){excluded[x.systemKey]='low_confidence';return false}
   if(x.daysObserved<90){excluded[x.systemKey]='short_history';return false}
   return true;
 });
 const domains=new Set(eligible.map(x=>x.domain));
 const days=eligible.length?Math.min(...eligible.map(x=>x.daysObserved)):0;
 const coverage=eligible.length?eligible.reduce((s,x)=>s+x.coverage,0)/eligible.length:0;

 if(eligible.length<MODEL.minSystems||domains.size<MODEL.minDomains){
  return empty('insufficient',coverage,days,eligible,excluded,domains.size,
   'Se requieren al menos 4 sistemas de 4 dominios independientes.');
 }

 // Raw reliability weight.
 let weighted=eligible.map(x=>({
   x,w:clamp(x.evidenceWeight,0,1)*clamp(x.confidence,0,1)*clamp(x.coverage,0,1)
 }));

 // Cap any one domain so duplicated physiology cannot dominate the global index.
 const total0=weighted.reduce((s,z)=>s+z.w,0)||1;
 const domainTotals=new Map<string,number>();
 for(const z of weighted)domainTotals.set(z.x.domain,(domainTotals.get(z.x.domain)??0)+z.w);
 weighted=weighted.map(z=>{
   const dt=domainTotals.get(z.x.domain)??z.w;
   const currentShare=dt/total0;
   const factor=currentShare>MODEL.domainCap?MODEL.domainCap/currentShare:1;
   return{x:z.x,w:z.w*factor};
 });

 const total=weighted.reduce((s,z)=>s+z.w,0);
 if(total<=0)return empty('insufficient',coverage,days,eligible,excluded,domains.size,'Peso efectivo insuficiente.');

 const contributions:PaceContribution[]=weighted.map(z=>{
   const nw=z.w/total;
   const sig=clamp(z.x.signal!,-MODEL.signalCap,MODEL.signalCap);
   return{systemKey:z.x.systemKey,domain:z.x.domain,signal:sig,effectiveWeight:z.w,normalizedWeight:nw,contribution:sig*nw};
 });
 const raw=contributions.reduce((s,c)=>s+c.contribution,0);

 // Shrink toward neutral when longitudinal maturity is limited.
 const maturity=clamp(Math.min(1,days/MODEL.minDays)*Math.min(1,coverage/MODEL.minCoverage),0,1);
 const shrinkFactor=MODEL.shrinkage+(1-MODEL.shrinkage)*maturity;
 const shrunken=raw*shrinkFactor;

 // Internal index: favorable signal lowers index. Deliberately bounded.
 const index=clamp(1-shrunken*.35,.70,1.30);
 const confidence=clamp(
   .35*(eligible.reduce((s,x)=>s+x.confidence,0)/eligible.length)+
   .25*coverage+
   .20*Math.min(1,days/MODEL.minDays)+
   .20*Math.min(1,domains.size/MODEL.minDomains),0,1
 );

 // Conservative uncertainty envelope; calibration layer can replace this later.
 const halfWidth=.18*(1-confidence)+.03;
 const status=days>=MODEL.minDays&&coverage>=MODEL.minCoverage?'stable_experimental':'experimental';

 return{
  status,indexValue:index,rawSignal:raw,shrunkenSignal:shrunken,confidence,coverage,
  daysObserved:days,systemsUsed:eligible.map(x=>x.systemKey),systemsExcluded:excluded,
  independentDomains:domains.size,uncertaintyLow:clamp(index-halfWidth,.65,1.35),
  uncertaintyHigh:clamp(index+halfWidth,.65,1.35),contributions,
  modelVersion:MODEL.version,
  semantics:'Internal longitudinal health-trajectory index; not biological years/year and not DunedinPACE.'
 };
}

function empty(status:'insufficient'|'warming_up',coverage:number,days:number,eligible:PaceSystemInput[],excluded:Record<string,string>,domains:number,why:string):PaceResult{
 return{status,indexValue:null,rawSignal:null,shrunkenSignal:null,confidence:0,coverage,daysObserved:days,
 systemsUsed:eligible.map(x=>x.systemKey),systemsExcluded:{...excluded,_reason:why},independentDomains:domains,
 uncertaintyLow:null,uncertaintyHigh:null,contributions:[],modelVersion:MODEL.version,
 semantics:'No numeric pace is emitted when eligibility is insufficient.'};
}
