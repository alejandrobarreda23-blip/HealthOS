import { supabase } from '../lib/supabase';
import { readAllPages } from './pagination';
import type { ClimbAnalysis } from '../health/cycling-climbs';
export async function getClimbAnalyses(subjectId:string):Promise<Map<string,ClimbAnalysis>> {
  if(!supabase)return new Map();const client=supabase;
  const rows=await readAllPages((from,to)=>client.from('activity_streams').select('session_id,climb_analysis').eq('subject_id',subjectId).not('climb_analysis','is',null).order('session_id').range(from,to));
  return new Map(rows.filter(r=>r.climb_analysis?.version==='climbs_v1').map(r=>[r.session_id,r.climb_analysis as ClimbAnalysis]));
}
export async function importClimbAnalysis(subjectId:string,sessionId:string):Promise<ClimbAnalysis> {
  if(!supabase)throw new Error('Sesión no disponible');
  const {data,error}=await supabase.functions.invoke('activity-streams',{body:{subject_id:subjectId,session_id:sessionId,climbs:true}});
  if(error){let message='No se pudo importar esta actividad.';try{const body=await error.context?.json();if(body?.message)message=body.message;}catch{/* Safe fallback. */}throw new Error(message);}
  if(!data?.analysis)throw new Error(data?.message??'Sin datos suficientes para subidas.');return data.analysis;
}
