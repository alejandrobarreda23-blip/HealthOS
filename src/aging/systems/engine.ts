import type{MetricSeries,SystemAssessment}from'./types';
import{SYSTEMS}from'./registry';
import{daysBetween,normalizedTrend}from'./stats';

function metricSignal(m:MetricSeries){
 const trend=normalizedTrend(m.values);
 if(trend===null)return null;
 const sign=m.higherIsBetter===false?-1:1;
 return trend*sign;
}

export function assessSystem(systemKey:string,series:MetricSeries[]):SystemAssessment{
 const def=SYSTEMS.find(s=>s.key===systemKey);
 if(!def)throw new Error(`Unknown system ${systemKey}`);
 const available=series.filter(s=>s.values.length>=2);
 const used=available.map(s=>s.key);
 const dates=available.flatMap(s=>s.values.map(v=>v.date)).sort();
 const days=dates.length?Math.round(daysBetween(dates[0],dates[dates.length-1])):0;
 const missing=def.required.filter(k=>!used.includes(k));
 const requiredPresent=def.required.filter(k=>used.includes(k)).length;
 const metricCoverage=Math.min(1,available.length/(def.required.length+Math.min(def.optional.length,3)));
 const timeCoverage=Math.min(1,days/def.minimumDays);
 const coverage=.6*metricCoverage+.4*timeCoverage;
 if(requiredPresent<def.minimumMetrics||days<def.minimumDays){
   return{systemKey,label:def.label,status:'insufficient',score:null,slope:null,confidence:coverage*.6,coverage,daysObserved:days,metricsUsed:used,missingMetrics:missing,evidence:{requiredPresent,minimumMetrics:def.minimumMetrics,minimumDays:def.minimumDays},version:'system-engine-v1'};
 }
 const signals=available.map(metricSignal).filter((x):x is number=>x!==null);
 const weighted=signals.length?signals.reduce((a,b)=>a+b,0)/signals.length:null;
 let status:SystemAssessment['status']='stable';
 if(weighted!==null){
   const positive=signals.filter(x=>x>.02).length,negative=signals.filter(x=>x<-.02).length;
   if(positive&&negative)status='mixed';
   else if(weighted>.02)status='improving';
   else if(weighted<-.02)status='worsening';
 }
 const confidence=Math.min(.95,.35+.35*metricCoverage+.25*timeCoverage);
 const score=weighted===null?null:Math.max(0,Math.min(100,50+weighted*100));
 return{systemKey,label:def.label,status,score,slope:weighted,confidence,coverage,daysObserved:days,metricsUsed:used,missingMetrics:missing,evidence:{signals,annualizedFractionalTrend:weighted},version:'system-engine-v1'};
}

export function assessAllSystems(series:MetricSeries[]){
 return SYSTEMS.map(s=>assessSystem(s.key,series));
}
