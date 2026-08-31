import type{
 AcquisitionActionability,AcquisitionCoverageStatus,AcquisitionGapGroup,
 AcquisitionOpportunity,AcquisitionPriorityTier
}from'./types';

const unique=<T,>(xs:T[])=>[...new Set(xs)];

const statusSeverity:Record<AcquisitionCoverageStatus,number>={
 missing:5,stale:4,below_density:3,observed_no_cadence:2,adequate:1
};

function dominantStatus(xs:AcquisitionOpportunity[]){
 return[...xs].sort((a,b)=>statusSeverity[b.status]-statusSeverity[a.status])[0].status;
}

function actionabilityRank(x:AcquisitionActionability){
 return({self_measurement:1,protocol_ready:2,passive:3,review_only:4,contextual:5}as const)[x];
}

function dominantActionability(xs:AcquisitionOpportunity[]){
 return[...xs].sort((a,b)=>actionabilityRank(a.actionability)-actionabilityRank(b.actionability))[0].actionability;
}

function textFor(label:string,status:AcquisitionCoverageStatus,actionability:AcquisitionActionability,count:number){
 const plural=count>1;
 if(actionability==='protocol_ready')return{
  headline:label,
  explanation:status==='missing'
   ?`No existe todavía una caracterización protocolizada${plural?' de estas señales':''}.`
   :`La cobertura disponible no completa el protocolo operativo definido.`,
  nextStep:'Puede valorarse una campaña protocolizada cuando encaje con el contexto. HealthOS no la prescribe automáticamente.'
 };
 if(actionability==='self_measurement')return{
  headline:label,
  explanation:status==='missing'
   ?'No hay observaciones normalizadas. Es una señal independiente y de baja fricción que puede enriquecer la trayectoria longitudinal.'
   :'La trayectoria reciente no alcanza la cobertura operativa definida.',
  nextStep:'Incorporar mediciones disponibles, manuales o desde un dispositivo compatible, sin convertirlo en una obligación diaria.'
 };
 if(actionability==='passive')return{
  headline:label,
  explanation:status==='missing'
   ?'No hay cobertura pasiva suficiente para esta capa de información.'
   :'La cobertura pasiva reciente es insuficiente para el contrato actual.',
  nextStep:'La prioridad es recuperar o conectar una fuente pasiva compatible antes de pedir registro manual.'
 };
 if(actionability==='contextual')return{
  headline:label,
  explanation:'Este dato sólo gana valor cuando existe una pregunta concreta o un experimento que justifique la carga manual.',
  nextStep:'No se solicita de forma rutinaria. Se reserva para periodos dirigidos por una hipótesis.'
 };
 return{
  headline:label,
  explanation:status==='missing'
   ?'No hay datos estructurados para esta dimensión. Su ausencia limita cobertura, pero no implica que deba medirse ahora.'
   :'Existe información previa, pero el contrato no define una repetición automática.',
  nextStep:'Revisar primero si existe una medición reciente fuera de HealthOS y el contexto profesional antes de plantear una nueva prueba.'
 };
}

export function groupAcquisitionOpportunities(xs:AcquisitionOpportunity[]):AcquisitionGapGroup[]{
 const buckets=new Map<string,AcquisitionOpportunity[]>();
 for(const x of xs){
  if(!buckets.has(x.groupKey))buckets.set(x.groupKey,[]);
  buckets.get(x.groupKey)!.push(x);
 }
 const groups:AcquisitionGapGroup[]=[];
 for(const[groupKey,items]of buckets){
  const priorityTier=Math.min(...items.map(x=>x.priorityTier)) as AcquisitionPriorityTier;
  const actionability=dominantActionability(items);
  const status=dominantStatus(items);
  const label=items.find(x=>x.groupLabel)?.groupLabel??items[0].displayName;
  const copy=textFor(label,status,actionability,items.length);
  groups.push({
   groupKey,label,priorityTier,actionability,
   metricKeys:items.map(x=>x.metricKey).sort(),displayNames:items.map(x=>x.displayName).sort(),
   domains:unique(items.map(x=>x.domain)).sort(),statuses:unique(items.map(x=>x.status)),
   priority:Math.max(...items.map(x=>x.priority)),
   protocolId:items.find(x=>x.protocolId)?.protocolId,
   preferredCadence:items.find(x=>x.preferredCadence)?.preferredCadence,
   headline:copy.headline,explanation:copy.explanation,nextStep:copy.nextStep,
   rationale:items.map(x=>x.acquisitionRationale).find(Boolean)??'Hueco definido por el contrato de adquisición.',
   boundary:'Orden de adquisición de información, no prioridad clínica ni recomendación médica.'
  });
 }
 return groups.sort((a,b)=>a.priorityTier-b.priorityTier||b.priority-a.priority||a.groupKey.localeCompare(b.groupKey));
}
