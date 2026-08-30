import type{RawSourceRecord}from'../connectors/connector';
import type{Normalizer,NormalizedObservation}from'./types';
import{assignPhysiologicalDate}from'../health/physiological-day';

type Payload={recordType:string;id:string;startTime:string;endTime?:string;zoneOffset?:string;data:Record<string,unknown>};
const p=(r:RawSourceRecord)=>r.payload as Payload;
const tz=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
const date=(x:Payload,rule:'measurement_local_date'|'start_date'|'wake_date')=>assignPhysiologicalDate({startedAt:new Date(x.startTime),endedAt:x.endTime?new Date(x.endTime):undefined,timezone:tz()},rule);
const obs=(r:RawSourceRecord,metricKey:string,valueNumeric:number,unit:string,rule:'measurement_local_date'|'start_date'|'wake_date'='measurement_local_date'):NormalizedObservation=>{const x=p(r);return{metricKey,valueNumeric,unit,startedAt:x.startTime,endedAt:x.endTime,timezone:tz(),physiologicalDate:date(x,rule),assignmentRule:rule,provider:'health_connect',sourceType:r.sourceType,measurementMethod:'health_connect_import',dataLevel:'measured',externalObservationId:r.externalId,normalizerVersion:'hc-core-v1'}};
const finite=(v:unknown,name:string)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(`Invalid ${name}`);return n};

export const healthConnectNormalizers:Normalizer[]=[
 {supports:r=>r.provider==='health_connect'&&r.recordType==='HeartRateVariabilityRmssd',normalize:r=>[obs(r,'hrv_rmssd',finite(p(r).data.milliseconds,'HRV'),'ms')]},
 {supports:r=>r.provider==='health_connect'&&r.recordType==='RestingHeartRate',normalize:r=>[obs(r,'resting_hr',finite(p(r).data.beatsPerMinute,'RHR'),'bpm')]},
 {supports:r=>r.provider==='health_connect'&&r.recordType==='SleepSession',normalize:r=>{const x=p(r);if(!x.endTime)throw new Error('SleepSession endTime required');const mins=(new Date(x.endTime).getTime()-new Date(x.startTime).getTime())/60000;return[obs(r,'sleep_duration',mins,'min','wake_date')] }},
 {supports:r=>r.provider==='health_connect'&&r.recordType==='Steps',normalize:r=>[obs(r,'steps',finite(p(r).data.count,'steps'),'count','start_date')]},
 {supports:r=>r.provider==='health_connect'&&r.recordType==='Weight',normalize:r=>[obs(r,'weight',finite(p(r).data.kilograms,'weight'),'kg')]}
];
