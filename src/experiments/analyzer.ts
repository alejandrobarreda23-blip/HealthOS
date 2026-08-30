import type{ExperimentAnalysisInput,ExperimentResult}from'./types';

const median=(xs:number[])=>{
 const a=[...xs].sort((x,y)=>x-y);
 if(!a.length)return null;
 const m=Math.floor(a.length/2);
 return a.length%2?a[m]:(a[m-1]+a[m])/2;
};

export function analyzePairedExperiment(i:ExperimentAnalysisInput):ExperimentResult{
 const n=Math.min(i.exposure.length,i.control.length);
 if(n<5)return{effect:null,nPairs:n,confidence:0,status:'insufficient',interpretation:'Menos de 5 pares analizables.',analysisVersion:'n-of-1-analysis-v1'};

 const diffs=Array.from({length:n},(_,k)=>i.exposure[k]-i.control[k]);
 const effect=median(diffs)!;
 const adherence=Math.max(0,Math.min(1,i.adherence));
 const coverage=Math.max(0,Math.min(1,i.confounderCoverage));
 const maturity=Math.min(1,n/12);
 const confidence=Math.min(.95,(0.45*adherence+0.35*coverage+0.20*maturity));

 let status:ExperimentResult['status']='no_clear_signal';
 if(confidence>=.55&&Math.abs(effect)>=.10)status=effect>0?'favorable':'unfavorable';

 return{
  effect,nPairs:n,confidence,status,
  interpretation:status==='no_clear_signal'
    ?'El experimento no muestra una señal suficientemente clara con el umbral actual.'
    :`Efecto mediano prospectivo ${effect>0?'favorable':'desfavorable'} con ${n} pares.`,
  analysisVersion:'n-of-1-analysis-v1'
 };
}
