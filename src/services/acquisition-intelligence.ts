import{buildAcquisitionOpportunity,rankAcquisitionOpportunities}from'../acquisition/coverage';
import{detectSourceContinuitySignals,suppressSourceDuplicatedStaleOpportunities}from'../acquisition/source-continuity';
import type{AcquisitionSnapshot}from'../acquisition/types';
import{getAcquisitionInputs}from'../repositories/acquisition';

export async function buildAcquisitionSnapshot(userId:string,asOf=new Date().toISOString().slice(0,10)):Promise<AcquisitionSnapshot>{
 const{contracts,summaries}=await getAcquisitionInputs(userId,asOf);
 const byKey=new Map(summaries.map(x=>[x.metricKey,x]));
 const all=contracts.map(c=>buildAcquisitionOpportunity(c,byKey.get(c.metricKey),asOf));
 const unresolved=rankAcquisitionOpportunities(all.filter(x=>x.status!=='adequate'&&x.status!=='observed_no_cadence'));
 const sourceSignals=detectSourceContinuitySignals(unresolved);
 const opportunities=suppressSourceDuplicatedStaleOpportunities(unresolved,sourceSignals);
 return{
  asOf,contracts:contracts.length,sourceSignals,opportunities,
  adequateMetrics:all.filter(x=>x.status==='adequate'||x.status==='observed_no_cadence').length,
  unresolvedMetrics:opportunities.length+sourceSignals.length
 };
}
