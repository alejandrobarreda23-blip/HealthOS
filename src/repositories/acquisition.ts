import{supabase}from'../lib/supabase';
import type{MetricAcquisitionContract,MetricObservationSummary,MeasurementMode,ManualBurden,LongitudinalRole}from'../acquisition/types';

const PAGE=1000;

type RegistryRow={
 metric_key:string;display_name:string;domain:string;canonical_unit:string|null;
 measurement_mode:MeasurementMode;continuous_required:boolean;preferred_cadence:string|null;
 protocol_id:string|null;event_triggered_reassessment:boolean;manual_burden:ManualBurden;
 longitudinal_roles:LongitudinalRole[]|null;minimum_useful_density:Record<string,unknown>|null;
 staleness_policy:Record<string,unknown>|null;
};

type SummaryRow={metric_key:string;observation_count:number;distinct_days:number;first_observed_at:string|null;last_observed_at:string|null;mean_quality_score:number|null;last_provider:string|null};
type RecentRow={metric_key:string;physiological_date:string};

export async function getAcquisitionInputs(userId:string,asOf:string):Promise<{contracts:MetricAcquisitionContract[];summaries:MetricObservationSummary[]}>{
 if(!supabase)return{contracts:[],summaries:[]};
 const{data:registry,error:re}=await supabase.from('metric_registry')
  .select('metric_key,display_name,domain,canonical_unit,measurement_mode,continuous_required,preferred_cadence,protocol_id,event_triggered_reassessment,manual_burden,longitudinal_roles,minimum_useful_density,staleness_policy')
  .not('measurement_mode','is',null).order('metric_key');
 if(re)throw re;
 const rows=(registry??[])as RegistryRow[];
 const contracts=rows.map(r=>({
  metricKey:r.metric_key,displayName:r.display_name,domain:r.domain,canonicalUnit:r.canonical_unit,
  measurementMode:r.measurement_mode,continuousRequired:r.continuous_required,preferredCadence:r.preferred_cadence??undefined,
  protocolId:r.protocol_id??undefined,eventTriggeredReassessment:r.event_triggered_reassessment,
  manualBurden:r.manual_burden,longitudinalRoles:r.longitudinal_roles??[],minimumUsefulDensity:r.minimum_useful_density??{},stalenessPolicy:r.staleness_policy??{}
 }));
 if(!contracts.length)return{contracts,summaries:[]};

 const{data:summary,error:se}=await supabase.from('metric_observation_summary')
  .select('metric_key,observation_count,distinct_days,first_observed_at,last_observed_at,mean_quality_score,last_provider')
  .eq('user_id',userId).in('metric_key',contracts.map(x=>x.metricKey));
 if(se)throw se;

 const maxWindow=Math.max(1,...contracts.map(c=>Number(c.minimumUsefulDensity?.window_days??0)).filter(Number.isFinite));
 const cutoff=new Date(Date.parse(asOf+'T12:00:00Z')-(maxWindow-1)*86_400_000).toISOString().slice(0,10);
 const recent:RecentRow[]=[];
 for(let from=0;;from+=PAGE){
  const{data,error}=await supabase.from('observations').select('metric_key,physiological_date')
   .eq('user_id',userId).in('metric_key',contracts.map(x=>x.metricKey))
   .gte('physiological_date',cutoff).lte('physiological_date',asOf).range(from,from+PAGE-1);
  if(error)throw error;
  const page=(data??[])as RecentRow[];recent.push(...page);
  if(page.length<PAGE)break;
 }
 const recentDays=new Map<string,Set<string>>();
 for(const r of recent){if(!recentDays.has(r.metric_key))recentDays.set(r.metric_key,new Set());recentDays.get(r.metric_key)!.add(r.physiological_date)}
 const summaries=((summary??[])as SummaryRow[]).map(r=>({
  metricKey:r.metric_key,observationCount:Number(r.observation_count),distinctDays:Number(r.distinct_days),
  firstObservedAt:r.first_observed_at,lastObservedAt:r.last_observed_at,meanQualityScore:r.mean_quality_score,
  recentDistinctDays:recentDays.get(r.metric_key)?.size??0,lastProvider:r.last_provider
 }));
 return{contracts,summaries};
}
