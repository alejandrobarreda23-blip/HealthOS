export function associationLabel(input:{effect:number|null;nMatched:number;direction:'higher_better'|'lower_better';minimumEffect:number}){
 if(input.effect===null||input.nMatched<5)return{status:'insufficient',confidence:0};
 const magnitude=Math.abs(input.effect),signal=magnitude>=input.minimumEffect;
 if(!signal)return{status:'no_clear_signal',confidence:Math.min(.75,.35+input.nMatched/100)};
 const positive=input.direction==='higher_better'?input.effect>0:input.effect<0;
 return{status:positive?'associated_favorable':'associated_unfavorable',confidence:Math.min(.9,.45+input.nMatched/60)};
}