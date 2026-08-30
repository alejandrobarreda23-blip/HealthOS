import type{AssociationEvidence}from'./types';import{OUTCOME_MAP}from'./outcome-map';import{mapAssociationToEffects,aggregateBehaviorImpacts}from'./effect-engine';import{deriveOpportunities}from'./opportunities';
export const demoAssociations:AssociationEvidence[]=[
 {exposureKey:'sauna',outcomeKey:'hrv_rmssd',effect:.18,nExposed:19,nControl:35,confidence:.72,confounderCoverage:.74,replicationCount:1,window:'overnight'},
 {exposureKey:'sauna',outcomeKey:'resting_hr',effect:-.10,nExposed:19,nControl:35,confidence:.68,confounderCoverage:.74,replicationCount:1,window:'overnight'},
 {exposureKey:'late_dinner',outcomeKey:'hrv_rmssd',effect:-.20,nExposed:24,nControl:42,confidence:.81,confounderCoverage:.78,replicationCount:2,window:'same_night'},
 {exposureKey:'late_dinner',outcomeKey:'resting_hr',effect:.15,nExposed:24,nControl:42,confidence:.79,confounderCoverage:.78,replicationCount:2,window:'same_night'},
 {exposureKey:'meditation',outcomeKey:'hrv_rmssd',effect:.06,nExposed:7,nControl:28,confidence:.48,confounderCoverage:.50,window:'overnight'}
];
export function learningDemo(){
 const effects=demoAssociations.flatMap(a=>mapAssociationToEffects(a,OUTCOME_MAP));
 const impacts=aggregateBehaviorImpacts(effects);
 return{effects,impacts,opportunities:deriveOpportunities(impacts)};
}
