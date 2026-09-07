export type CampaignStatus='planned'|'active'|'completed'|'cancelled';
export type BpOccasion='morning'|'evening';
export interface MeasurementProtocolSnapshot{
 occasions?:string[];readings_per_occasion?:number;preferred_days?:number;minimum_days?:number;
 [key:string]:unknown;
}
export interface MeasurementCampaign{
 id:string;protocolId:string;protocolVersion:string;protocolSnapshot:MeasurementProtocolSnapshot;
 status:CampaignStatus;startedAt:string;completedAt?:string|null;cancelledAt?:string|null;
}
export interface CampaignProgress{
 campaign:MeasurementCampaign;distinctDays:number;recordedDays:number;measurementGroups:number;occasionsCompleted:number;
 expectedOccasions:number;minimumDays:number;preferredDays:number;eligibleToComplete:boolean;targetReached:boolean;
}
export interface ManualMeasurementContext{measuredAt:string;timezone:string;utcOffsetMinutes:number;physiologicalDate:string}
