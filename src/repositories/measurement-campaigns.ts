import{supabase}from'../lib/supabase';
import{localMeasurementContext}from'../measurement/context';
import{computeCampaignProgress}from'../measurement/progress';
import type{BpOccasion,CampaignProgress,MeasurementCampaign,MeasurementProtocolSnapshot}from'../measurement/types';

type CampaignRow={id:string;protocol_id:string;protocol_version:string;protocol_snapshot:MeasurementProtocolSnapshot;status:'planned'|'active'|'completed'|'cancelled';started_at:string;completed_at:string|null;cancelled_at:string|null};
const map=(r:CampaignRow):MeasurementCampaign=>({id:r.id,protocolId:r.protocol_id,protocolVersion:r.protocol_version,protocolSnapshot:r.protocol_snapshot,status:r.status,startedAt:r.started_at,completedAt:r.completed_at,cancelledAt:r.cancelled_at});

export async function startCampaign(userId:string,protocolId:string):Promise<MeasurementCampaign>{
 if(!supabase)throw new Error('Supabase no está configurado.');
 const{data:p,error:pe}=await supabase.from('measurement_protocol_registry').select('protocol_id,protocol_version,protocol,boundaries').eq('protocol_id',protocolId).eq('active',true).single();
 if(pe||!p)throw pe??new Error('Protocolo no disponible.');
 const{data,error}=await supabase.from('measurement_campaigns').insert({user_id:userId,protocol_id:p.protocol_id,protocol_version:p.protocol_version,protocol_snapshot:p.protocol,boundaries_snapshot:p.boundaries,status:'active'}).select('id,protocol_id,protocol_version,protocol_snapshot,status,started_at,completed_at,cancelled_at').single();
 if(error)throw error;return map(data as CampaignRow);
}

export async function getActiveCampaign(userId:string,protocolId:string):Promise<MeasurementCampaign|null>{
 if(!supabase)return null;
 const{data,error}=await supabase.from('measurement_campaigns').select('id,protocol_id,protocol_version,protocol_snapshot,status,started_at,completed_at,cancelled_at').eq('user_id',userId).eq('protocol_id',protocolId).in('status',['planned','active']).maybeSingle();
 if(error)throw error;return data?map(data as CampaignRow):null;
}

export async function getCampaignProgress(campaign:MeasurementCampaign):Promise<CampaignProgress>{
 if(!supabase)throw new Error('Supabase no está configurado.');
 const{data,error}=await supabase.from('measurement_groups').select('protocol_day,protocol_occasion,reading_index').eq('campaign_id',campaign.id).order('measured_at');
 if(error)throw error;return computeCampaignProgress(campaign,(data??[])as Array<{protocol_day:number|null;protocol_occasion:string|null;reading_index:number|null}>);
}

export async function addWeightMeasurement(userId:string,kg:number,when=new Date()):Promise<void>{
 if(!supabase)throw new Error('Supabase no está configurado.');if(!(kg>20&&kg<400))throw new Error('Introduce un peso válido.');
 const c=localMeasurementContext(when);
 const{error}=await supabase.from('observations').insert({user_id:userId,metric_key:'weight',value_numeric:kg,unit:'kg',started_at:c.measuredAt,timezone:c.timezone,utc_offset_minutes:c.utcOffsetMinutes,physiological_date:c.physiologicalDate,assignment_rule:'measurement_local_date',provider:'healthos_manual',source_type:'manual',measurement_method:'home_scale_manual',data_level:'measured',normalizer_version:'manual_v1'});
 if(error)throw error;
}

export async function addBloodPressureReading(userId:string,campaign:MeasurementCampaign,input:{systolic:number;diastolic:number;occasion:BpOccasion;readingIndex:number;when?:Date}):Promise<void>{
 if(!supabase)throw new Error('Supabase no está configurado.');
 if(!(input.systolic>=60&&input.systolic<=260&&input.diastolic>=30&&input.diastolic<=160&&input.systolic>input.diastolic))throw new Error('Revisa los valores introducidos.');
 const when=input.when??new Date(),c=localMeasurementContext(when);
 const start=new Date(campaign.startedAt);const day=Math.max(1,Math.floor((new Date(c.physiologicalDate+'T12:00:00').getTime()-new Date(start.getFullYear(),start.getMonth(),start.getDate(),12).getTime())/86_400_000)+1);
 const{data:g,error:ge}=await supabase.from('measurement_groups').insert({user_id:userId,group_type:'blood_pressure',measured_at:c.measuredAt,timezone:c.timezone,utc_offset_minutes:c.utcOffsetMinutes,campaign_id:campaign.id,protocol_day:day,protocol_occasion:input.occasion,reading_index:input.readingIndex}).select('id').single();
 if(ge)throw ge;
 const common={user_id:userId,started_at:c.measuredAt,timezone:c.timezone,utc_offset_minutes:c.utcOffsetMinutes,physiological_date:c.physiologicalDate,assignment_rule:'measurement_local_date' as const,provider:'healthos_manual',source_type:'manual' as const,measurement_method:'home_bp_cuff_manual_entry',data_level:'measured' as const,measurement_group_id:g.id,normalizer_version:'manual_v1'};
 const{error}=await supabase.from('observations').insert([
  {...common,metric_key:'systolic_blood_pressure',value_numeric:input.systolic,unit:'mmHg'},
  {...common,metric_key:'diastolic_blood_pressure',value_numeric:input.diastolic,unit:'mmHg'}
 ]);
 if(error){await supabase.from('measurement_groups').delete().eq('id',g.id);throw error;}
}

export async function completeCampaign(campaign:MeasurementCampaign):Promise<void>{
 if(!supabase)throw new Error('Supabase no está configurado.');const p=await getCampaignProgress(campaign);if(!p.eligibleToComplete)throw new Error(`Se necesitan al menos ${p.minimumDays} días con mediciones.`);
 const{error}=await supabase.from('measurement_campaigns').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',campaign.id);if(error)throw error;
}
