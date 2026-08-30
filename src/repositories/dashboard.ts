import{demo}from'../demo/data';import{supabase}from'../lib/supabase';

export type DashboardData=Omit<typeof demo,'mode'> & {mode:'demo'|'live'|'empty'};

export async function getDashboard(userId:string,date:string):Promise<DashboardData>{
 if(!supabase)return demo;

 // The UI reads provider-neutral canonical/feature tables only.
 const[{data:features,error:fe},{data:findings,error:fi}]=await Promise.all([
   supabase.from('daily_features').select('*').eq('user_id',userId).eq('physiological_date',date),
   supabase.from('findings').select('*').eq('user_id',userId).eq('status','active').order('detected_at',{ascending:false}).limit(5)
 ]);
 if(fe)throw fe;if(fi)throw fi;

 const f=new Map((features??[]).map((x:any)=>[x.feature_key,x.value_numeric??x.value_text??x.value_boolean]));
 const has=(k:string)=>f.has(k);
 if(!features?.length&&!findings?.length)return emptyDashboard(date);

 return{
   mode:'live',
   date:new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(new Date(date+'T12:00:00')),
   recovery:{
     hrv:Number(f.get('hrv_7d_median')??0),
     hrvDelta:Number(f.get('hrv_change_pct')??0),
     rhr:Number(f.get('resting_hr_7d_median')??0),
     rhrDelta:Number(f.get('resting_hr_change_pct')??0)
   },
   sleep:{
     duration:formatMinutes(Number(f.get('sleep_duration_minutes')??0)),
     delta:Number(f.get('sleep_change_minutes')??0),
     efficiency:Number(f.get('sleep_efficiency')??0)
   },
   activity:{
     steps:Number(f.get('steps')??0),
     loadDelta:Number(f.get('training_load_change_pct')??0)
   },
   body:{weight:Number(f.get('weight')??0),delta:Number(f.get('weight_change')??0)},
   quality:Math.round(Number(f.get('data_quality')??0)*100),
   findings:(findings??[]).map((x:any)=>({title:x.title,detail:x.summary??'',severity:x.severity}))
 };
}
function formatMinutes(n:number){if(!n)return '—';return `${Math.floor(n/60)} h ${Math.round(n%60)} min`}

function emptyDashboard(date:string):DashboardData{return{mode:'empty',date:new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(new Date(date+'T12:00:00')),recovery:{hrv:0,hrvDelta:0,rhr:0,rhrDelta:0},sleep:{duration:'—',delta:0,efficiency:0},activity:{steps:0,loadDelta:0},body:{weight:0,delta:0},quality:0,findings:[]}}
