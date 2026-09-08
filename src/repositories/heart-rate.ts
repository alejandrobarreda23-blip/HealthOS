import {supabase} from '../lib/supabase';
import {readAllPages} from './pagination';
import {normalizeStreams,settingsError,type HrSettings,type HrStream} from '../health/heart-rate';
export async function getHrSettings(subjectId:string):Promise<HrSettings[]>{
  if(!supabase)return [];
  const {data,error}=await supabase.from('subject_hr_settings').select('*').eq('subject_id',subjectId);if(error)throw error;return data??[];
}
export async function saveHrSettings(input:HrSettings){
  const problem=settingsError(input);if(problem)throw new Error(problem);if(!supabase)throw new Error('Sesión no disponible');
  const {data,error}=await supabase.from('subject_hr_settings').upsert({...input,updated_at:new Date().toISOString()},{onConflict:'subject_id,sport'}).select().single();if(error)throw error;return data as HrSettings;
}
export async function getHrSources(userId:string){
  if(!supabase)return new Map<string,Record<string,unknown>>();
  const client=supabase;
  const rows=await readAllPages((from,to)=>client.from('source_records').select('id,external_id,payload:payload->icu_average_watts,device_watts:payload->device_watts,average_speed:payload->average_speed,device_name:payload->>device_name,ignore_power:payload->icu_ignore_power,ignore_hr:payload->icu_ignore_hr,ignore_pace:payload->ignore_pace,ignore_velocity:payload->ignore_velocity,moving_time:payload->moving_time,elapsed_time:payload->elapsed_time,average_temp:payload->average_temp,route_id:payload->route_id').eq('user_id',userId).eq('provider','intervals_icu').eq('record_type','activity').order('id').range(from,to));
  return new Map(rows.map((r:any)=>[r.id,{external_id:r.external_id,icu_average_watts:r.payload,device_watts:r.device_watts,average_speed:r.average_speed,device_name:r.device_name,icu_ignore_power:r.ignore_power,icu_ignore_hr:r.ignore_hr,ignore_pace:r.ignore_pace,ignore_velocity:r.ignore_velocity,moving_time:r.moving_time,elapsed_time:r.elapsed_time,average_temp:r.average_temp,route_id:r.route_id}]));
}
export async function getHrStream(subjectId:string,sessionId:string):Promise<HrStream|null>{
  if(!supabase)return null;
  const {data,error}=await supabase.from('activity_streams').select('streams').eq('subject_id',subjectId).eq('session_id',sessionId).maybeSingle();if(error)throw error;return normalizeStreams(data?.streams);
}
export async function importHrStream(subjectId:string,sessionId:string):Promise<{stream:HrStream|null;message:string}>{
  if(!supabase)throw new Error('Sesión no disponible');
  const {data,error}=await supabase.functions.invoke('activity-streams',{body:{subject_id:subjectId,session_id:sessionId}});if(error){let message='No se pudo obtener la curva. Revisa la conexión de Intervals o inténtalo más tarde.';try{const body=await error.context?.json();if(typeof body?.message==='string')message=body.message;}catch{/* Keep the safe fallback. */}throw new Error(message);}
  return {stream:normalizeStreams(data?.streams),message:data?.message??''};
}
