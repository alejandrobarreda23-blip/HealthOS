import type{MetricSeries}from'./types';
function seq(key:string,start:number,end:number,n:number,higherIsBetter:boolean):MetricSeries{
 const now=new Date('2026-08-29T12:00:00Z');
 return{key,higherIsBetter,values:Array.from({length:n},(_,i)=>({date:new Date(now.getTime()-(n-1-i)*7*86400000).toISOString().slice(0,10),value:start+(end-start)*(i/(n-1))}))};
}
export const agingDemoSeries:MetricSeries[]=[
 seq('resting_hr',52,48,20,false),
 seq('systolic_bp',122,116,20,false),
 seq('hrv_rmssd',62,70,20,true),
 seq('vo2max',47,51,20,true),
 seq('sleep_duration',420,440,16,true),
 seq('sleep_efficiency',88,91,16,true),
 seq('sleep_regularity',.68,.79,16,true),
 seq('weight',75,74.2,20,false),
 seq('glucose_fasting',5.2,4.9,20,false)
];
