import { supabase } from '../lib/supabase';

export type DailyCheckIn={
  energy_score?:number; stress_score?:number; mood_score?:number;
  fatigue_score?:number; pain_score?:number; hunger_score?:number;
  concentration_score?:number; note?:string;
};

export async function saveDailyCheckIn(userId:string,date:string,value:DailyCheckIn){
  if(!supabase) throw new Error('Supabase is not configured');
  const {data,error}=await supabase.from('subjective_reports')
    .upsert({user_id:userId,physiological_date:date,...value},{onConflict:'user_id,physiological_date'})
    .select().single();
  if(error) throw error;
  return data;
}
