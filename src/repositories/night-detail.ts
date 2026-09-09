import { supabase } from '../lib/supabase';
import { readAllPages } from './pagination';
import type { SleepRecord } from '../health/weekly-learning';
import type { NightDetail, NightStage } from '../health/night-explorer';
export async function getNightDetail(userId: string, session: SleepRecord): Promise<NightDetail> {
  const client=supabase;if(!client)throw new Error('No hay conexión de datos.');
  const start=Date.parse(session.start),end=Date.parse(session.end);
  if(!userId||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>20*3600000)throw new Error('Intervalo de sueño no válido.');
  const owner=await client.from('sleep_sessions').select('id').eq('id',session.id).eq('user_id',userId).maybeSingle();
  if(owner.error)throw new Error(owner.error.message);if(!owner.data)throw new Error('La noche no está disponible para este perfil.');
  const [stages,samples]=await Promise.all([
    readAllPages((from,to)=>client.from('sleep_stages').select('stage,started_at,ended_at,id').eq('sleep_session_id',session.id).order('started_at').order('id').range(from,to)),
    readAllPages((from,to)=>{let q=client.from('observations').select('metric_key,value_numeric,unit,started_at,id').eq('user_id',userId).eq('data_level','measured').in('metric_key',['heart_rate','ultrahuman_hrv','skin_temperature']).gte('started_at',session.start).lte('started_at',session.end);
      q=session.provider?q.eq('provider',session.provider):q.is('provider',null);q=session.device?q.eq('source_device',session.device):q.is('source_device',null);q=session.version?q.eq('normalizer_version',session.version):q.is('normalizer_version',null);
      return q.order('started_at').order('id').range(from,to);}),
  ]);
  const valid=(key:string,unit:string,value:number)=>Number.isFinite(value)&&(key==='heart_rate'?unit==='bpm'&&value>0&&value<=350:key==='ultrahuman_hrv'?unit==='ms'&&value>0&&value<=1000:unit==='degC'&&value>0&&value<=50);
  return {stages:stages.map(s=>({stage:s.stage as NightStage['stage'],start:Date.parse(s.started_at),end:Date.parse(s.ended_at)})),samples:samples.filter(s=>valid(s.metric_key,s.unit,s.value_numeric)).map(s=>({key:s.metric_key,time:Date.parse(s.started_at),value:s.value_numeric})).filter(s=>Number.isFinite(s.time)&&s.time>=start&&s.time<=end)};
}
