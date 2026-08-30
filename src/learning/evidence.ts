import type{AssociationEvidence,PersonalEvidenceLevel}from'./types';
export function personalEvidenceLevel(a:AssociationEvidence):PersonalEvidenceLevel{
 if(a.experimentSupported&&a.nExposed>=8)return'experiment_supported';
 const n=Math.min(a.nExposed,a.nControl);
 if(n<5||a.confidence<.35)return'insufficient';
 if(n<10||a.confidence<.55||a.confounderCoverage<.45)return'exploratory';
 if(n>=20&&a.confidence>=.78&&a.confounderCoverage>=.70&&(a.replicationCount??0)>=1)return'strong';
 return'moderate';
}
export const levelFactor=(l:PersonalEvidenceLevel)=>({
 insufficient:0,exploratory:.25,moderate:.55,strong:.80,experiment_supported:1
}[l]);
