import{median}from'../features/robust';

export type Day={date:string;exposed:boolean;outcome:number;covariates:Record<string,number|boolean|null>};
function distance(a:Day,b:Day,keys:string[]){
 let d=0,n=0;for(const k of keys){const x=a.covariates[k],y=b.covariates[k];if(x==null||y==null)continue;n++;if(typeof x==='boolean'||typeof y==='boolean')d+=x===y?0:1;else d+=Math.abs(Number(x)-Number(y))/(Math.abs(Number(x))+Math.abs(Number(y))+1)}
 return n?d/n:Infinity;
}
export function matchedAssociation(days:Day[],confounders:string[]){
 const exposed=days.filter(x=>x.exposed),controls=days.filter(x=>!x.exposed);const pairs=exposed.map(e=>{const c=[...controls].sort((a,b)=>distance(e,a,confounders)-distance(e,b,confounders))[0];return c?{e,c,d:distance(e,c,confounders)}:null}).filter(Boolean) as {e:Day;c:Day;d:number}[];
 const diffs=pairs.filter(p=>Number.isFinite(p.d)&&p.d<=.35).map(p=>p.e.outcome-p.c.outcome);
 const effect=median(diffs);return{effect,nExposed:exposed.length,nControl:controls.length,nMatched:diffs.length,method:'nearest-context-v1',evidence:{medianPairedDifference:effect,pairDifferences:diffs}};
}
