import type{AcquisitionOpportunity,SourceContinuitySignal}from'./types';

export interface SourceContinuityOptions{
 minimumMetrics?:number;
 maxEndSpreadDays?:number;
}

/**
 * Detects several passive metrics from the same provider becoming stale at
 * effectively the same time. It is a source/acquisition signal, not physiology.
 */
export function detectSourceContinuitySignals(
 opportunities:AcquisitionOpportunity[],
 options:SourceContinuityOptions={}
):SourceContinuitySignal[]{
 const minimumMetrics=options.minimumMetrics??3;
 const maxEndSpreadDays=options.maxEndSpreadDays??1;
 const candidates=opportunities.filter(x=>
  x.status==='stale'&&
  (x.measurementMode==='passive_daily'||x.measurementMode==='passive_continuous')&&
  !!x.lastProvider&&!!x.lastObservedAt&&x.coverage.daysSinceLastObservation!==null
 );
 const groups=new Map<string,AcquisitionOpportunity[]>();
 for(const x of candidates){
  const provider=x.lastProvider!;
  if(!groups.has(provider))groups.set(provider,[]);
  groups.get(provider)!.push(x);
 }
 const out:SourceContinuitySignal[]=[];
 for(const[provider,xs]of groups){
  if(xs.length<minimumMetrics)continue;
  const ages=xs.map(x=>x.coverage.daysSinceLastObservation as number);
  const minAge=Math.min(...ages),maxAge=Math.max(...ages);
  if(maxAge-minAge>maxEndSpreadDays)continue;
  const latest=[...xs].sort((a,b)=>Date.parse(b.lastObservedAt!)-Date.parse(a.lastObservedAt!))[0];
  out.push({
   kind:'source_discontinuity',provider,
   affectedMetricKeys:xs.map(x=>x.metricKey).sort(),
   affectedDisplayNames:xs.map(x=>x.displayName).sort(),
   lastObservedAt:latest.lastObservedAt!,
   daysSinceLastObservation:minAge,
   synchronizedEnd:true,
   reason:`${xs.length} señales pasivas del mismo proveedor dejaron de aportar datos en el mismo intervalo.`,
   boundary:'Señal de continuidad de adquisición. No distingue entre dispositivo no usado, desconexión, permisos o fallo de sincronización y no implica un cambio fisiológico.'
  });
 }
 return out.sort((a,b)=>b.affectedMetricKeys.length-a.affectedMetricKeys.length||a.provider.localeCompare(b.provider));
}

export function suppressSourceDuplicatedStaleOpportunities(
 opportunities:AcquisitionOpportunity[],signals:SourceContinuitySignal[]
){
 const covered=new Set(signals.flatMap(x=>x.affectedMetricKeys));
 return opportunities.filter(x=>!(x.status==='stale'&&covered.has(x.metricKey)));
}
