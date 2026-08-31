import type{
 AcquisitionAction,AcquisitionCoverage,AcquisitionOpportunity,
 MetricAcquisitionContract,MetricObservationSummary
}from'./types';
import{acquisitionPriority,burdenWeight,modeReliabilityWeight,roleRelevanceWeight}from'./policy';

const DAY=86_400_000;
const asNumber=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;

function daysBetween(a:string,b:string){
 return Math.max(0,Math.floor((Date.parse(b+'T12:00:00Z')-Date.parse(a.slice(0,10)+'T12:00:00Z'))/DAY));
}

function densityPolicy(c:MetricAcquisitionContract){
 const p=c.minimumUsefulDensity??{};
 return{
  windowDays:asNumber(p.window_days),
  minimumDistinctDays:asNumber(p.minimum_distinct_days),
  targetDistinctDays:asNumber(p.target_distinct_days)
 };
}

function maxAgeDays(c:MetricAcquisitionContract){
 return asNumber((c.stalenessPolicy??{}).max_age_days);
}

export function evaluateAcquisitionCoverage(
 c:MetricAcquisitionContract,
 s:MetricObservationSummary|undefined,
 asOf:string
):AcquisitionCoverage{
 const count=s?.observationCount??0;
 const distinct=s?.distinctDays??0;
 const recent=s?.recentDistinctDays??0;
 const d=densityPolicy(c);
 const maxAge=maxAgeDays(c);
 const daysSince=s?.lastObservedAt?daysBetween(s.lastObservedAt,asOf):null;

 if(count===0)return{metricKey:c.metricKey,status:'missing',observationCount:0,distinctDays:0,recentDistinctDays:0,daysSinceLastObservation:null,densityRatio:d.minimumDistinctDays?0:null,minimumDistinctDays:d.minimumDistinctDays,targetDistinctDays:d.targetDistinctDays,windowDays:d.windowDays};
 if(maxAge!==null&&daysSince!==null&&daysSince>maxAge)return{metricKey:c.metricKey,status:'stale',observationCount:count,distinctDays:distinct,recentDistinctDays:recent,daysSinceLastObservation:daysSince,densityRatio:d.minimumDistinctDays?recent/d.minimumDistinctDays:null,minimumDistinctDays:d.minimumDistinctDays,targetDistinctDays:d.targetDistinctDays,windowDays:d.windowDays};
 if(d.minimumDistinctDays!==null&&recent<d.minimumDistinctDays)return{metricKey:c.metricKey,status:'below_density',observationCount:count,distinctDays:distinct,recentDistinctDays:recent,daysSinceLastObservation:daysSince,densityRatio:recent/d.minimumDistinctDays,minimumDistinctDays:d.minimumDistinctDays,targetDistinctDays:d.targetDistinctDays,windowDays:d.windowDays};
 if(maxAge===null&&d.minimumDistinctDays===null)return{metricKey:c.metricKey,status:'observed_no_cadence',observationCount:count,distinctDays:distinct,recentDistinctDays:recent,daysSinceLastObservation:daysSince,densityRatio:null,minimumDistinctDays:null,targetDistinctDays:null,windowDays:null};
 return{metricKey:c.metricKey,status:'adequate',observationCount:count,distinctDays:distinct,recentDistinctDays:recent,daysSinceLastObservation:daysSince,densityRatio:d.minimumDistinctDays?Math.min(1,recent/d.minimumDistinctDays):null,minimumDistinctDays:d.minimumDistinctDays,targetDistinctDays:d.targetDistinctDays,windowDays:d.windowDays};
}

function informationValue(c:AcquisitionCoverage){
 if(c.status==='missing')return 1;
 if(c.status==='stale')return .88;
 if(c.status==='below_density')return Math.min(.85,.45+.4*(1-Math.min(1,c.densityRatio??0)));
 if(c.status==='observed_no_cadence')return .18;
 return .08;
}

function actionFor(c:MetricAcquisitionContract,coverage:AcquisitionCoverage):AcquisitionAction{
 if(coverage.status==='adequate')return'maintain_passive';
 if(c.measurementMode==='episodic_protocol')return'consider_campaign';
 if(c.measurementMode==='laboratory_periodic'||c.measurementMode==='clinical_episodic')return'review_gap';
 return'consider_measurement';
}

function reasonFor(c:MetricAcquisitionContract,x:AcquisitionCoverage){
 if(x.status==='missing')return`${c.displayName}: no hay observaciones normalizadas todavía.`;
 if(x.status==='stale')return`${c.displayName}: la última observación queda fuera de la política operativa de frescura.`;
 if(x.status==='below_density')return`${c.displayName}: cobertura reciente ${x.recentDistinctDays}/${x.minimumDistinctDays??'—'} días en la ventana definida.`;
 if(x.status==='observed_no_cadence')return`${c.displayName}: existe historia, pero el contrato no define una cadencia universal de repetición.`;
 return`${c.displayName}: cobertura suficiente para el contrato actual.`;
}

export function buildAcquisitionOpportunity(c:MetricAcquisitionContract,s:MetricObservationSummary|undefined,asOf:string):AcquisitionOpportunity{
 const coverage=evaluateAcquisitionCoverage(c,s,asOf);
 const reason=reasonFor(c,coverage);
 const priority=acquisitionPriority({
  key:c.metricKey,
  informationValue:informationValue(coverage),
  reliability:modeReliabilityWeight(c.measurementMode),
  physiologicalRelevance:roleRelevanceWeight(c.longitudinalRoles),
  burden:burdenWeight(c.manualBurden),
  reason
 });
 return{
  metricKey:c.metricKey,displayName:c.displayName,domain:c.domain,status:coverage.status,
  action:actionFor(c,coverage),priority,reason,measurementMode:c.measurementMode,
  preferredCadence:c.preferredCadence,protocolId:c.protocolId,longitudinalRoles:c.longitudinalRoles,
  coverage,lastProvider:s?.lastProvider??null,lastObservedAt:s?.lastObservedAt??null,
  boundary:'Prioridad de adquisición, no indicación clínica. No autoriza pruebas, diagnóstico ni tratamiento.'
 };
}

export function rankAcquisitionOpportunities(xs:AcquisitionOpportunity[]){
 return[...xs].sort((a,b)=>b.priority-a.priority||a.metricKey.localeCompare(b.metricKey));
}
