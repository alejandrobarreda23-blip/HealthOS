import{paceEligibility}from'./coverage';
/**
 * v0 deliberately refuses to invent a numeric pace.
 * The scorer will be enabled only after its longitudinal calibration contract exists.
 */
export function estimateHealthOsPace(input:{daysObserved:number;systems:number;coverage:number}){
 const e=paceEligibility(input);
 if(!e.eligible)return{value:null,status:'insufficient' as const,confidence:e.confidence,reason:'Se necesitan ≥180 días, ≥4 sistemas y ≥70% de cobertura.',checks:e.checks,version:'healthos-pace-v0'};
 return{value:null,status:'calibration_required' as const,confidence:e.confidence,reason:'Datos suficientes para modelar, pero el estimador numérico aún no está calibrado. No se mostrará una cifra ficticia.',checks:e.checks,version:'healthos-pace-v0'};
}