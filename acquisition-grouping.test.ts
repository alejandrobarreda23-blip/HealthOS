import{describe,it,expect}from'vitest';
import{groupAcquisitionOpportunities}from'../src/acquisition/grouping';
import type{AcquisitionOpportunity}from'../src/acquisition/types';

function gap(metricKey:string,displayName:string,groupKey:string,groupLabel:string,actionability:AcquisitionOpportunity['actionability'],tier:1|2|3,priority=.8):AcquisitionOpportunity{
 return{metricKey,displayName,domain:'test',status:'missing',action:'consider_measurement',priority,priorityTier:tier,reason:'missing',measurementMode:actionability==='protocol_ready'?'episodic_protocol':'home_periodic',longitudinalRoles:['trajectory'],boundary:'test',groupKey,groupLabel,actionability,acquisitionRationale:'adds independent information',coverage:{metricKey,status:'missing',observationCount:0,distinctDays:0,recentDistinctDays:0,daysSinceLastObservation:null,densityRatio:null,minimumDistinctDays:null,targetDistinctDays:null,windowDays:null}};
}

describe('independent acquisition gaps',()=>{
 it('collapses paired blood-pressure metrics into one protocol gap',()=>{
  const xs=[gap('systolic_blood_pressure','Systolic BP','home_bp','Presión arterial domiciliaria','protocol_ready',1),gap('diastolic_blood_pressure','Diastolic BP','home_bp','Presión arterial domiciliaria','protocol_ready',1)];
  const groups=groupAcquisitionOpportunities(xs);
  expect(groups).toHaveLength(1);
  expect(groups[0].metricKeys).toHaveLength(2);
  expect(groups[0].actionability).toBe('protocol_ready');
 });
 it('orders policy tiers before numeric tie-break scores',()=>{
  const groups=groupAcquisitionOpportunities([gap('lab','Lab','lab','Lab','review_only',2,10),gap('weight','Weight','weight','Peso','self_measurement',1,.1)]);
  expect(groups[0].groupKey).toBe('weight');
 });
 it('keeps review-only laboratory gaps non-prescriptive',()=>{
  const [group]=groupAcquisitionOpportunities([gap('hba1c','HbA1c','glycemic_lab','Cobertura metabólica','review_only',1)]);
  expect(group.nextStep).toContain('Revisar primero');
  expect(group.boundary).toContain('no prioridad clínica');
 });
});
