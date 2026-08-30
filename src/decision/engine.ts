import type{Opportunity}from'../learning/opportunities';import type{ExperimentProtocol}from'../experiments/types';import type{PaceResult}from'../aging/pace/types';
import{fromOpportunity,fromExperiment,fromPaceCoverage}from'./candidates';import{rankDecisions}from'./ranker';

export function buildDecisionQueue(args:{opportunities:Opportunity[];protocols:ExperimentProtocol[];pace:PaceResult}){
 const candidates=[
  ...args.opportunities.map(fromOpportunity),
  ...args.protocols.map(fromExperiment),
  ...fromPaceCoverage(args.pace)
 ];
 // Deduplicate behavior + experiment on same exposure: when evidence is exploratory,
 // prefer the experiment rather than pretending the behavior is established.
 const experimental=new Set(args.protocols.map(p=>p.exposureKey));
 const filtered=candidates.filter(c=>{
  if(c.kind!=='behavior')return true;
  const exposure=c.key.split(':')[1]?.split(':')[0];
  const o=args.opportunities.find(x=>`behavior:${x.key}`===c.key);
  return !(o&&experimental.has(o.exposureKey)&&(o.evidenceLevel==='exploratory'||o.evidenceLevel==='insufficient'));
 });
 return{candidates:filtered,queue:rankDecisions(filtered),engineVersion:'decision-engine-v1'};
}
