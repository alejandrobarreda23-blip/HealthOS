import{supabase}from'../lib/supabase';
export async function saveEvent(userId:string,input:{eventType:string;startedAt:string;physiologicalDate:string;quantity?:number;unit?:string;note?:string}){
 if(!supabase){const k='healthos-events';const a=JSON.parse(localStorage.getItem(k)||'[]');a.push(input);localStorage.setItem(k,JSON.stringify(a));return input}
 const{data,error}=await supabase.from('events').insert({user_id:userId,event_type:input.eventType,started_at:input.startedAt,physiological_date:input.physiologicalDate,assignment_rule:'start_date',provider:'manual',source_type:'manual',data_level:'reported',quantity:input.quantity??null,unit:input.unit??null,note:input.note??null}).select().single();if(error)throw error;return data;
}