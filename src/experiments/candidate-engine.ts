import type{Opportunity}from'../learning/opportunities';
import type{ExperimentCandidate}from'./types';
import{EXPERIMENT_TEMPLATES}from'./catalog';

export function experimentCandidates(opportunities:Opportunity[]):ExperimentCandidate[]{
 return opportunities.flatMap(o=>{
  const t=EXPERIMENT_TEMPLATES[o.exposureKey];
  if(!t)return[];
  if(o.evidenceLevel==='experiment_supported')return[];
  if(o.action==='maintain')return[];
  return [{
   exposureKey:o.exposureKey,
   currentEvidence:o.evidenceLevel,
   opportunityAction:o.action,
   candidateOutcomes:[t.primaryOutcome,...t.secondaryOutcomes],
   confounders:t.confounders,
   eventFrequencyPerWeek:0,
   burden:'low',
   reversible:true,
   expectedDirection:o.action==='reduce'?'unfavorable':o.action==='increase'?'favorable':'unknown',
   safetyClass:t.safetyClass
  } satisfies ExperimentCandidate];
 });
}
