import type{AssociationEvidence,OutcomeMap,PersonalEffect,BehaviorSystemImpact}from'./types';
import{personalEvidenceLevel,levelFactor}from'./evidence';

const clamp=(x:number,a=-1,b=1)=>Math.max(a,Math.min(b,x));

function favorable(effect:number,direction:OutcomeMap['direction']){
 if(direction==='higher_favorable')return effect;
 if(direction==='lower_favorable')return-effect;
 // range/contextual effects require reference-engine evaluation upstream.
 return 0;
}

export function mapAssociationToEffects(a:AssociationEvidence,maps:OutcomeMap[]):PersonalEffect[]{
 const level=personalEvidenceLevel(a);
 return maps.filter(m=>m.outcomeKey===a.outcomeKey).map(m=>{
   const fe=a.effect==null||m.direction==='range'||m.direction==='contextual'?null:clamp(favorable(a.effect,m.direction));
   return{exposureKey:a.exposureKey,outcomeKey:a.outcomeKey,systemKey:m.systemKey,
    standardizedEffect:a.effect==null?null:clamp(a.effect),favorableEffect:fe,
    confidence:a.confidence*levelFactor(level),evidenceLevel:level,
    nExposed:a.nExposed,nControl:a.nControl,window:a.window,relevance:m.relevance};
 });
}

export function aggregateBehaviorImpacts(effects:PersonalEffect[]):BehaviorSystemImpact[]{
 const groups=new Map<string,PersonalEffect[]>();
 for(const e of effects){const k=`${e.exposureKey}|${e.systemKey}`;groups.set(k,[...(groups.get(k)??[]),e])}
 return[...groups.values()].map(es=>{
   const usable=es.filter(e=>e.favorableEffect!=null&&e.evidenceLevel!=='insufficient');
   const weights=usable.map(e=>e.relevance*e.confidence);
   const total=weights.reduce((a,b)=>a+b,0);
   const impact=total?usable.reduce((s,e,i)=>s+e.favorableEffect!*weights[i],0)/total:null;
   const confidence=usable.length?Math.min(.95,usable.reduce((s,e)=>s+e.confidence,0)/usable.length*(1-Math.exp(-usable.length/2))):0;
   const rank={insufficient:0,exploratory:1,moderate:2,strong:3,experiment_supported:4} as const;
   const best=es.reduce((a,b)=>rank[b.evidenceLevel]>rank[a.evidenceLevel]?b:a).evidenceLevel;
   return{exposureKey:es[0].exposureKey,systemKey:es[0].systemKey,favorableImpact:impact,confidence,evidenceLevel:best,outcomeCount:usable.length,effects:es};
 });
}
