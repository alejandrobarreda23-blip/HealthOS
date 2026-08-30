import type{DecisionCandidate}from'./types';
const c=(x:number)=>Math.max(0,Math.min(1,x));

/**
 * Benefit and information value are separate.
 * A low-evidence experiment may rank highly because it can resolve uncertainty,
 * while a well-supported behavior may rank highly because expected benefit is high.
 */
export function decisionScore(x:DecisionCandidate){
 const positive=
   .32*c(x.expectedBenefit)+
   .25*c(x.informationGain)+
   .18*c(x.evidenceConfidence)+
   .15*c(x.actionability)+
   .10*c(x.uncertainty*x.informationGain);
 const friction=.18*c(x.burden)+.45*c(x.safetyPenalty);
 return c(positive-friction);
}
