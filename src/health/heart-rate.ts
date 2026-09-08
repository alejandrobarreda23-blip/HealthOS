import type {TrainingSession} from '../repositories/activities';
import {sessionSeconds} from './activities';
import {minusDays} from './metrics/daily-series';

export type HrSettings={subject_id:string;sport:string;method:'max'|'reserve'|'custom';max_hr:number|null;rest_hr:number|null;date_of_birth:string|null;custom_edges:number[]|null;updated_at?:string};
export type HrStream={time:number[];heartrate:(number|null)[];watts?:(number|null)[];velocity_smooth?:(number|null)[]};
export type HrZones={edges:number[];max:number|null;label:string;estimated:boolean};
export const hrNumber=(v:unknown,min=0,max=1000000):number|null=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
export function hrTime(seconds:number){const n=Math.round(seconds),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return `${h?`${h} h `:''}${m} min${s?` ${s} s`:''}`;}
export function settingsError(s:HrSettings):string|null {
  if(s.max_hr!==null&&(hrNumber(s.max_hr,60,240)===null||!Number.isInteger(s.max_hr)))return 'La FC máxima debe ser un entero entre 60 y 240 bpm.';
  if(s.rest_hr!==null&&(hrNumber(s.rest_hr,25,120)===null||!Number.isInteger(s.rest_hr)))return 'La FC de reposo debe ser un entero entre 25 y 120 bpm.';
  if(s.rest_hr!==null&&s.max_hr!==null&&s.rest_hr>=s.max_hr)return 'La FC de reposo debe ser menor que la máxima.';
  if(s.date_of_birth&&(!/^\d{4}-\d{2}-\d{2}$/.test(s.date_of_birth)||!Number.isFinite(Date.parse(s.date_of_birth))||s.date_of_birth>new Date().toISOString().slice(0,10)))return 'Revisa la fecha de nacimiento.';
  if(s.method==='reserve'&&(s.max_hr===null||s.rest_hr===null))return 'El método de reserva requiere FC máxima y de reposo personales.';
  if(s.method==='custom'&&(!s.custom_edges||s.custom_edges.length!==6||s.custom_edges.some((v,i,a)=>hrNumber(v,25,240)===null||!Number.isInteger(v)||(i>0&&v<=a[i-1]))))return 'Introduce seis límites enteros crecientes, entre 25 y 240 bpm.';
  return null;
}
export function resolveZones(s:HrSettings|null,source:Record<string,unknown>|null,date:string):HrZones|null {
  if(s&&settingsError(s))return null;
  if(s?.method==='custom')return {edges:s.custom_edges!,max:s.max_hr,label:'Límites personales · configuración actual',estimated:false};
  let max=s?.max_hr??null;let label='FC máxima personal · configuración actual';let estimated=false;
  if(max===null){max=hrNumber(source?.athlete_max_hr,60,240);label='FC máxima configurada en origen · no verificada';estimated=true;}
  if(max===null&&s?.date_of_birth){const age=Number(date.slice(0,4))-Number(s.date_of_birth.slice(0,4))-(date.slice(5)<s.date_of_birth.slice(5)?1:0);if(age>=18&&age<=100){max=208-.7*age;label=`FC máxima estimada por edad (${age} años) · Tanaka`;estimated=true;}}
  if(max===null)return null;
  const rest=s?.method==='reserve'?s.rest_hr!:0;
  return {edges:[.5,.6,.7,.8,.9,1].map(f=>Math.round(rest+f*(max!-rest))),max,label:s?.method==='reserve'?'Reserva de FC · configuración actual':label,estimated};
}
export function sourceZones(source:Record<string,unknown>|null){
  const upper=source?.icu_hr_zones,seconds=source?.icu_hr_zone_times;
  if(!Array.isArray(upper)||!Array.isArray(seconds)||upper.length!==seconds.length||!upper.length||upper.length>12||upper.some((v,i)=>hrNumber(v,25,250)===null||(i>0&&v<=upper[i-1]))||seconds.some(v=>hrNumber(v)===null))return null;
  return upper.map((v,i)=>({label:`Z${i+1}`,range:i?`>${upper[i-1]}–${v} bpm`:`≤${v} bpm`,seconds:seconds[i] as number}));
}
export function normalizeStreams(input:unknown):HrStream|null {
  if(!Array.isArray(input))return null;
  const byType=new Map(input.filter(x=>x&&typeof x.type==='string'&&Array.isArray(x.data)).map(x=>[x.type,x.data as unknown[]]));
  const time=byType.get('time'),hr=byType.get('heartrate');
  if(!time||!hr||time.length!==hr.length||time.length<2||time.length>200000||time.some((v,i)=>hrNumber(v,0,172800)===null||(i>0&&(v as number)<=(time[i-1] as number))))return null;
  const output:HrStream={time:time as number[],heartrate:hr.map(v=>hrNumber(v,25,250))};
  for(const key of ['watts','velocity_smooth'] as const){const data=byType.get(key);if(data?.length===time.length)output[key]=data.map(v=>hrNumber(v,0,key==='watts'?3000:60));}
  return output;
}
export function analyzeHeartRate(stream:HrStream,zones:HrZones|null,from=0,to=Infinity){
  let observed=0,sum=0,peak:number|null=null;const times=Array(7).fill(0) as number[];
  const bins:Array<{start:number;end:number;seconds:number;hr:number;watts:number|null;speed:number|null}>=[];
  for(let i=0;i<stream.time.length-1;i++){
    const start=Math.max(from,stream.time[i]),end=Math.min(to,stream.time[i+1]),dt=end-start,hr=stream.heartrate[i];
    // Zero-order hold only between adjacent samples up to 10 s apart; never bridge gaps.
    if(dt<=0||stream.time[i+1]-stream.time[i]>10||hrNumber(hr,25,250)===null)continue;
    observed+=dt;sum+=hr!*dt;peak=peak===null?hr!:Math.max(peak,hr!);
    if(zones){let z=zones.edges.findIndex(e=>hr!<e);if(hr===zones.edges[5])z=5;times[z<0?6:z]+=dt;}
    bins.push({start,end,seconds:dt,hr:hr!,watts:stream.watts?.[i]??null,speed:stream.velocity_smooth?.[i]??null});
  }
  const span=Math.max(0,Math.min(to,stream.time.at(-1)??0)-Math.max(from,stream.time[0]??0));
  return {observed,span,coverage:span?observed/span:0,mean:observed?sum/observed:null,peak,times,bins};
}
export function hrPeers(session:TrainingSession,sessions:TrainingSession[],sources:Map<string,Record<string,unknown>>,mode:'power'|'speed'){
  const current=sources.get(session.id);const value=(p:Record<string,unknown>|undefined)=>p?.icu_ignore_hr===true?null:mode==='power'?(p?.device_watts===true&&p.icu_ignore_power!==true?hrNumber(p.icu_average_watts,1,3000):null):(p?.ignore_pace===true||p?.ignore_velocity===true?null:hrNumber(p?.average_speed,.1,60));
  const target=value(current),duration=sessionSeconds(session);if(target===null||duration===null)return [];
  return sessions.filter(s=>s.id!==session.id&&s.activity_type===session.activity_type&&s.provider===session.provider&&s.physiological_date<session.physiological_date&&s.physiological_date>=minusDays(session.physiological_date,180)).flatMap(s=>{
    const source=sources.get(s.id),v=value(source),d=sessionSeconds(s),hr=hrNumber(s.avg_heart_rate_bpm,25,250);
    if(v===null||d===null||hr===null||Math.abs(v/target-1)>.1||Math.abs(d/duration-1)>.2)return [];
    const a=hrNumber(session.elevation_gain_m),b=hrNumber(s.elevation_gain_m);
    if(a===null||b===null||Math.abs(a-b)>Math.max(100,a*.2))return [];
    return [{session:s,value:v,hr,score:Math.abs(v/target-1)+Math.abs(d/duration-1),source}];
  }).sort((a,b)=>a.score-b.score||b.session.started_at.localeCompare(a.session.started_at));
}
export function matchedEffort(a:HrStream,b:HrStream,mode:'power'|'speed'){
  const width=mode==='power'?25:.5;const group=(s:HrStream)=>{const m=new Map<number,{seconds:number;sum:number}>();for(const x of analyzeHeartRate(s,null,600).bins){const v=mode==='power'?x.watts:x.speed;if(v===null||v<=0)continue;const key=Math.floor(v/width),g=m.get(key)??{seconds:0,sum:0};g.seconds+=x.seconds;g.sum+=x.hr*x.seconds;m.set(key,g);}return m;};
  const first=group(a),second=group(b);
  return [...first].flatMap(([key,x])=>{const y=second.get(key);return y&&x.seconds>=180&&y.seconds>=180?[{low:key*width,high:(key+1)*width,a:x.sum/x.seconds,b:y.sum/y.seconds,aSeconds:x.seconds,bSeconds:y.seconds}]:[];}).sort((a,b)=>a.low-b.low);
}
