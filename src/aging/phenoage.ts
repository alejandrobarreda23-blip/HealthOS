export type PhenoAgeInputs={
 ageYears:number;
 albuminGL:number;
 creatinineUmolL:number;
 glucoseMmolL:number;
 crpMgDl:number;
 lymphocytePercent:number;
 mcvFl:number;
 rdwPercent:number;
 alkalinePhosphataseUL:number;
 wbc10e3Ul:number;
};

/**
 * Clinical Phenotypic Age formula.
 * Units are strict. Conversion must happen upstream and be provenance-preserving.
 */
export function calculatePhenoAge(x:PhenoAgeInputs):number{
 if(x.crpMgDl<=0)throw new Error('CRP must be > 0 for log transform');
 const xb=
 -19.907
 -0.0336*x.albuminGL
 +0.0095*x.creatinineUmolL
 +0.1953*x.glucoseMmolL
 +0.0954*Math.log(x.crpMgDl)
 -0.0120*x.lymphocytePercent
 +0.0268*x.mcvFl
 +0.3306*x.rdwPercent
 +0.00188*x.alkalinePhosphataseUL
 +0.0554*x.wbc10e3Ul
 +0.0804*x.ageYears;
 const mortality=1-Math.exp(-1.51714*Math.exp(xb)/0.0076927);
 const age=141.50225 + Math.log(-0.00553*Math.log(1-mortality))/0.09165;
 if(!Number.isFinite(age))throw new Error('PhenoAge result is not finite');
 return age;
}
