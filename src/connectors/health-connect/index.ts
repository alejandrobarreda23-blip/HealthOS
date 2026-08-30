import { Capacitor } from '@capacitor/core';
import type{HealthConnector,RawSourceRecord}from'../connector';
import{HealthConnectNative}from'./plugin';
import{CORE_HEALTH_CONNECT_RECORDS}from'./permissions';

const now=()=>new Date();
const defaultStart=()=>new Date(Date.now()-30*24*3600_000);

export const healthConnectConnector:HealthConnector={
 id:'health_connect',displayName:'Health Connect',
 async isAvailable(){
   if(Capacitor.getPlatform()!=='android')return false;
   try{return (await HealthConnectNative.isAvailable()).available}catch{return false}
 },
 async requestPermissions(){
   const r=await HealthConnectNative.requestPermissions({recordTypes:CORE_HEALTH_CONNECT_RECORDS});
   const missing=CORE_HEALTH_CONNECT_RECORDS.filter(x=>!r.granted.includes(x));
   if(missing.length)throw new Error(`Health Connect permissions missing: ${missing.join(', ')}`);
 },
 async sync(p){
   const start=p.since?new Date(p.since):defaultStart();
   const end=p.until?new Date(p.until):now();
   const result=await HealthConnectNative.readRecords({recordTypes:CORE_HEALTH_CONNECT_RECORDS,startTime:start.toISOString(),endTime:end.toISOString()});
   const records:RawSourceRecord[]=result.records.map(r=>({
     provider:'health_connect',sourceType:'mobile_os',recordType:r.recordType,externalId:r.id,
     sourceUpdatedAt:r.lastModifiedTime,sourceSchemaVersion:'health-connect-native-v1',payload:r
   }));
   return{records};
 }
};
