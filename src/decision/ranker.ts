import type{DecisionCandidate,DecisionContext,DecisionItem}from'./types';
import{decisionScore}from'./scoring';

export function rankDecisions(candidates:DecisionCandidate[],ctx:DecisionContext={maxItems:3,diversityPenalty:.12,maxPerSystem:2}):DecisionItem[]{
 const remaining=[...candidates];
 const selected:DecisionItem[]=[];
 const systemCounts=new Map<string,number>();

 while(remaining.length&&selected.length<ctx.maxItems){
  let bestIndex=-1,best=-1;
  for(let i=0;i<remaining.length;i++){
   const x=remaining[i];
   if(x.systems.some(s=>(systemCounts.get(s)??0)>=ctx.maxPerSystem))continue;
   const overlap=x.systems.reduce((n,s)=>n+(systemCounts.get(s)??0),0);
   const adjusted=decisionScore(x)-ctx.diversityPenalty*overlap;
   if(adjusted>best){best=adjusted;bestIndex=i}
  }
  if(bestIndex<0)break;
  const x=remaining.splice(bestIndex,1)[0];
  const score=decisionScore(x);
  const urgency=x.safetyPenalty>=.65?'review':score>=.62?'soon':'routine';
  selected.push({...x,score,rank:selected.length+1,urgency});
  x.systems.forEach(s=>systemCounts.set(s,(systemCounts.get(s)??0)+1));
 }
 return selected;
}
