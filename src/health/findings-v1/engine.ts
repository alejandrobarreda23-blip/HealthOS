import { buildBaselineSnapshotV1, medianV1, robustZV1 } from '../baselines/engine';
import type { DatedValue, EvidenceStrength } from '../baselines/types';
import { FINDING_REGISTRY_V1 } from './registry';
import type { FindingCandidateV1, FindingSeverityV1 } from './types';

function minusDays(date:string,days:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10);}
function recentRows(rows:DatedValue[],end:string,days:number){const start=minusDays(end,days-1);return rows.filter(r=>r.date>=start&&r.date<=end);}
function strength(recentN:number,recentExpected:number,baseline:'INSUFFICIENT'|'LOW'|'MODERATE'|'HIGH'):EvidenceStrength{
  const c=recentExpected?recentN/recentExpected:0;if(baseline==='INSUFFICIENT'||c<.5)return'INSUFFICIENT';if(baseline==='LOW'||c<.7)return'LOW';if(baseline==='MODERATE'||c<.85)return'MODERATE';return'HIGH';
}
function severityFromZ(z:number|null):FindingSeverityV1{const a=Math.abs(z??0);return a>=2.5?'high':a>=2?'moderate':a>=1.25?'low':'info';}

export function detectSustainedHrvDropV2(asOfDate:string,rows:DatedValue[],confounders:string[]=[]):FindingCandidateV1|null{
  const reg=FINDING_REGISTRY_V1.sustained_hrv_drop; const recent=recentRows(rows,asOfDate,7); if(recent.length<reg.minimumRecentSamples)return null;
  const baselineRows=rows.filter(r=>r.date<minusDays(asOfDate,6)); const b=buildBaselineSnapshotV1('hrv_rmssd',minusDays(asOfDate,7),baselineRows); if(!b.sufficient||b.median===null)return null;
  const observed=medianV1(recent.map(r=>r.value)); if(observed===null)return null; const change=(observed-b.median)/b.median; const z=robustZV1(observed,b.median,b.mad);
  if(change>-0.10 && (z===null||z>-1.25))return null;
  return {findingKey:reg.findingKey,domain:reg.domain,title:reg.title,summary:`HRV mediana 7 d ${observed.toFixed(0)} ms frente a referencia ${b.median.toFixed(0)} ms (${(change*100).toFixed(1)}%).`,periodStart:minusDays(asOfDate,6),periodEnd:asOfDate,severity:severityFromZ(z),evidenceStrength:strength(recent.length,7,b.evidenceStrength),detectorVersion:reg.detectorVersion,inputMetrics:reg.inputMetrics,observedValue:observed,referenceValue:b.median,effectSize:change,robustZ:z,sampleCount:recent.length,coverage:recent.length/7,evidence:{recentMedian:observed,baseline:b},confounders,interpretationBoundary:reg.interpretationBoundary};
}

export function detectSustainedRhrElevationV1(asOfDate:string,rows:DatedValue[],confounders:string[]=[]):FindingCandidateV1|null{
  const reg=FINDING_REGISTRY_V1.sustained_rhr_elevation; const recent=recentRows(rows,asOfDate,7); if(recent.length<4)return null;
  const b=buildBaselineSnapshotV1('resting_heart_rate',minusDays(asOfDate,7),rows.filter(r=>r.date<minusDays(asOfDate,6))); if(!b.sufficient||b.median===null)return null;
  const observed=medianV1(recent.map(r=>r.value)); if(observed===null)return null; const change=(observed-b.median)/b.median; const z=robustZV1(observed,b.median,b.mad);
  if(change<0.05 && (z===null||z<1.25))return null;
  return {findingKey:reg.findingKey,domain:reg.domain,title:reg.title,summary:`FC reposo mediana 7 d ${observed.toFixed(0)} bpm frente a referencia ${b.median.toFixed(0)} bpm (${(change*100).toFixed(1)}%).`,periodStart:minusDays(asOfDate,6),periodEnd:asOfDate,severity:severityFromZ(z),evidenceStrength:strength(recent.length,7,b.evidenceStrength),detectorVersion:reg.detectorVersion,inputMetrics:reg.inputMetrics,observedValue:observed,referenceValue:b.median,effectSize:change,robustZ:z,sampleCount:recent.length,coverage:recent.length/7,evidence:{recentMedian:observed,baseline:b},confounders,interpretationBoundary:reg.interpretationBoundary};
}

export function detectSleepDeficitV1(asOfDate:string,rows:DatedValue[],confounders:string[]=[]):FindingCandidateV1|null{
  const reg=FINDING_REGISTRY_V1.sleep_deficit; const recent=recentRows(rows,asOfDate,7); if(recent.length<4)return null;
  const b=buildBaselineSnapshotV1('sleep_duration',minusDays(asOfDate,7),rows.filter(r=>r.date<minusDays(asOfDate,6))); if(!b.sufficient||b.median===null)return null;
  const observed=medianV1(recent.map(r=>r.value)); if(observed===null)return null; const delta=observed-b.median; const z=robustZV1(observed,b.median,b.mad); if(delta>-30&&(z===null||z>-1.25))return null;
  return {findingKey:reg.findingKey,domain:reg.domain,title:reg.title,summary:`Sueño mediana 7 d ${(observed/60).toFixed(1)} h frente a referencia ${(b.median/60).toFixed(1)} h (${delta.toFixed(0)} min).`,periodStart:minusDays(asOfDate,6),periodEnd:asOfDate,severity:severityFromZ(z),evidenceStrength:strength(recent.length,7,b.evidenceStrength),detectorVersion:reg.detectorVersion,inputMetrics:reg.inputMetrics,observedValue:observed,referenceValue:b.median,effectSize:delta,robustZ:z,sampleCount:recent.length,coverage:recent.length/7,evidence:{recentMedian:observed,baseline:b},confounders,interpretationBoundary:reg.interpretationBoundary};
}

export function detectInsufficientRecentDataV1(asOfDate:string,metricCoverage:Record<string,{observed:number;expected:number}>):FindingCandidateV1|null{
  const reg=FINDING_REGISTRY_V1.insufficient_recent_data; const entries=Object.entries(metricCoverage); if(!entries.length)return null;
  const ratios=entries.map(([,v])=>v.expected<=0?0:v.observed/v.expected); const avg=ratios.reduce((a,b)=>a+b,0)/ratios.length; if(avg>=.5)return null;
  return {findingKey:reg.findingKey,domain:reg.domain,title:reg.title,summary:`Cobertura media reciente ${(avg*100).toFixed(0)}%; se bloquean inferencias que requieran continuidad.`,periodStart:minusDays(asOfDate,6),periodEnd:asOfDate,severity:'info',evidenceStrength:'HIGH',detectorVersion:reg.detectorVersion,inputMetrics:Object.keys(metricCoverage),sampleCount:entries.reduce((s,[,v])=>s+v.observed,0),coverage:avg,evidence:{metricCoverage},confounders:[],interpretationBoundary:reg.interpretationBoundary};
}

export function detectRecoveryConcordanceV1(
  asOfDate:string,
  hrvFinding:FindingCandidateV1|null,
  rhrFinding:FindingCandidateV1|null,
  confounders:string[]=[]
):FindingCandidateV1|null{
  if(!hrvFinding||!rhrFinding)return null;
  const reg=FINDING_REGISTRY_V1.recovery_concordance;
  const strengthOrder:EvidenceStrength[]=['INSUFFICIENT','LOW','MODERATE','HIGH'];
  const evidenceStrength=strengthOrder[Math.min(strengthOrder.indexOf(hrvFinding.evidenceStrength),strengthOrder.indexOf(rhrFinding.evidenceStrength))];
  const severityOrder:FindingSeverityV1[]=['info','low','moderate','high'];
  const severity=severityOrder[Math.max(severityOrder.indexOf(hrvFinding.severity),severityOrder.indexOf(rhrFinding.severity))];
  return {
    findingKey:reg.findingKey,domain:reg.domain,title:reg.title,
    summary:'HRV y FC de reposo se han desplazado simultáneamente en direcciones desfavorables respecto de sus referencias personales.',
    periodStart:minusDays(asOfDate,6),periodEnd:asOfDate,severity,evidenceStrength,
    detectorVersion:reg.detectorVersion,inputMetrics:reg.inputMetrics,
    sampleCount:Math.min(hrvFinding.sampleCount,rhrFinding.sampleCount),coverage:Math.min(hrvFinding.coverage,rhrFinding.coverage),
    evidence:{hrv:hrvFinding.evidence,rhr:rhrFinding.evidence},confounders,
    interpretationBoundary:reg.interpretationBoundary
  };
}

export function detectSpo2DeviationV1(asOfDate:string,rows:DatedValue[],confounders:string[]=[]):FindingCandidateV1|null{
  const reg=FINDING_REGISTRY_V1.spo2_deviation;
  const recent=recentRows(rows,asOfDate,7); if(recent.length<reg.minimumRecentSamples)return null;
  const b=buildBaselineSnapshotV1('oxygen_saturation',minusDays(asOfDate,7),rows.filter(r=>r.date<minusDays(asOfDate,6)));
  if(!b.sufficient||b.median===null)return null;
  const observed=medianV1(recent.map(r=>r.value)); if(observed===null)return null;
  const delta=observed-b.median; const z=robustZV1(observed,b.median,b.mad);
  if(delta>-1 && (z===null||z>-1.25))return null;
  return {findingKey:reg.findingKey,domain:reg.domain,title:reg.title,summary:`SpO₂ reciente ${observed.toFixed(1)}% frente a referencia personal ${b.median.toFixed(1)}% (${delta.toFixed(1)} puntos).`,periodStart:minusDays(asOfDate,6),periodEnd:asOfDate,severity:severityFromZ(z),evidenceStrength:strength(recent.length,7,b.evidenceStrength),detectorVersion:reg.detectorVersion,inputMetrics:reg.inputMetrics,observedValue:observed,referenceValue:b.median,effectSize:delta,robustZ:z,sampleCount:recent.length,coverage:recent.length/7,evidence:{recentMedian:observed,baseline:b},confounders,interpretationBoundary:reg.interpretationBoundary};
}

export function detectWeightTrendV1(asOfDate:string,rows:DatedValue[],confounders:string[]=[]):FindingCandidateV1|null{
  const reg=FINDING_REGISTRY_V1.weight_trend;
  const recent=recentRows(rows,asOfDate,28); if(recent.length<reg.minimumRecentSamples)return null;
  const baselineEnd=minusDays(asOfDate,28);
  const b=buildBaselineSnapshotV1('weight',baselineEnd,rows.filter(r=>r.date<=baselineEnd),{windowDays:90,minSamples:8,minCoverage:.08});
  if(!b.sufficient||b.median===null||b.median===0)return null;
  const observed=medianV1(recent.map(r=>r.value)); if(observed===null)return null;
  const change=(observed-b.median)/b.median; const z=robustZV1(observed,b.median,b.mad);
  if(Math.abs(change)<.02 && (z===null||Math.abs(z)<1.25))return null;
  const direction=change>0?'superior':'inferior';
  return {findingKey:reg.findingKey,domain:reg.domain,title:reg.title,summary:`Peso mediano reciente ${observed.toFixed(1)} kg, ${Math.abs(change*100).toFixed(1)}% ${direction} a la referencia de largo plazo (${b.median.toFixed(1)} kg).`,periodStart:minusDays(asOfDate,27),periodEnd:asOfDate,severity:severityFromZ(z),evidenceStrength:strength(recent.length,28,b.evidenceStrength),detectorVersion:reg.detectorVersion,inputMetrics:reg.inputMetrics,observedValue:observed,referenceValue:b.median,effectSize:change,robustZ:z,sampleCount:recent.length,coverage:Math.min(1,recent.length/28),evidence:{recentMedian:observed,baseline:b},confounders,interpretationBoundary:reg.interpretationBoundary};
}
