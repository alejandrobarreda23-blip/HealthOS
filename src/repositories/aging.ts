import{supabase}from'../lib/supabase';import type{AgingAssessment,AgingDriver}from'../aging/types';
export async function getAgingDashboard(userId:string){
 if(!supabase)return null;
 const[{data:a,error:ae},{data:d,error:de}]=await Promise.all([
  supabase.from('aging_assessments').select('*').eq('user_id',userId).order('assessment_date',{ascending:false}).limit(20),
  supabase.from('aging_drivers').select('*').eq('user_id',userId).order('assessment_date',{ascending:false}).limit(20)
 ]);
 if(ae)throw ae;if(de)throw de;return{assessments:a??[],drivers:d??[]};
}
