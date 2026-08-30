export const PHENOAGE_INPUTS=['ageYears','albuminGL','creatinineUmolL','glucoseMmolL','crpMgDl','lymphocytePercent','mcvFl','rdwPercent','alkalinePhosphataseUL','wbc10e3Ul'] as const;
export function inputCoverage(input:Record<string,unknown>,required:readonly string[]){
 const missing=required.filter(k=>input[k]===undefined||input[k]===null);
 return{coverage:(required.length-missing.length)/required.length,missing};
}
export function paceEligibility(input:{daysObserved:number;systems:number;coverage:number}){
 const checks={window:input.daysObserved>=180,systems:input.systems>=4,coverage:input.coverage>=.7};
 const passed=Object.values(checks).filter(Boolean).length;
 return{eligible:Object.values(checks).every(Boolean),confidence:passed/3,checks};
}
