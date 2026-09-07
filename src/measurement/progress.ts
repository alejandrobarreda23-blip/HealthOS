import type{CampaignProgress,MeasurementCampaign}from'./types';
export interface CampaignGroupSlot{protocol_day:number|null;protocol_occasion:string|null;reading_index:number|null}
export function computeCampaignProgress(campaign:MeasurementCampaign,rows:CampaignGroupSlot[]):CampaignProgress{
 const minimumDays=Number(campaign.protocolSnapshot.minimum_days??3);
 const preferredDays=Number(campaign.protocolSnapshot.preferred_days??7);
 const requiredOccasions=campaign.protocolSnapshot.occasions??['morning','evening'];
 const readingsPerOccasion=Number(campaign.protocolSnapshot.readings_per_occasion??2);
 const slots=new Map<string,Set<number>>();
 const recordedDays=new Set<number>();
 for(const r of rows){
  if(r.protocol_day==null||!r.protocol_occasion||r.reading_index==null)continue;
  recordedDays.add(r.protocol_day);const k=`${r.protocol_day}:${r.protocol_occasion}`;
  if(!slots.has(k))slots.set(k,new Set());slots.get(k)!.add(r.reading_index);
 }
 const completeOccasions=new Set<string>();
 for(const[k,v]of slots)if(v.size>=readingsPerOccasion)completeOccasions.add(k);
 let validDays=0;
 for(const day of recordedDays){if(requiredOccasions.every(o=>completeOccasions.has(`${day}:${o}`)))validDays++}
 return{campaign,distinctDays:validDays,recordedDays:recordedDays.size,measurementGroups:rows.length,occasionsCompleted:completeOccasions.size,expectedOccasions:preferredDays*requiredOccasions.length,minimumDays,preferredDays,eligibleToComplete:validDays>=minimumDays,targetReached:validDays>=preferredDays};
}
