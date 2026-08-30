export type LabMetric='albumin'|'creatinine'|'glucose'|'crp'|'lymphocyte_percent'|'mcv'|'rdw'|'alkaline_phosphatase'|'wbc';
export interface ConvertedLabValue{metric:LabMetric;inputValue:number;inputUnit:string;value:number;unit:string;conversion:string;plausible:boolean}
const norm=(u:string)=>u.trim().toLowerCase().replace(/µ/g,'u').replace(/μ/g,'u').replace(/\s/g,'');
const ranges:Record<LabMetric,[number,number]>={albumin:[15,65],creatinine:[25,1500],glucose:[1.5,35],crp:[.001,30],lymphocyte_percent:[1,90],mcv:[50,130],rdw:[5,35],alkaline_phosphatase:[5,2000],wbc:[.5,100]};
const target:Record<LabMetric,string>={albumin:'g/L',creatinine:'umol/L',glucose:'mmol/L',crp:'mg/dL',lymphocyte_percent:'%',mcv:'fL',rdw:'%',alkaline_phosphatase:'U/L',wbc:'10^3/uL'};
function convert(metric:LabMetric,v:number,u:string){const x=norm(u);switch(metric){
 case'albumin': if(['g/l','gl'].includes(x))return[v,'identity'];if(['g/dl','gdl'].includes(x))return[v*10,'g/dL→g/L'];break;
 case'creatinine':if(['umol/l','umoll'].includes(x))return[v,'identity'];if(['mg/dl','mgdl'].includes(x))return[v*88.4,'mg/dL→umol/L'];break;
 case'glucose':if(['mmol/l','mmoll'].includes(x))return[v,'identity'];if(['mg/dl','mgdl'].includes(x))return[v/18.0182,'mg/dL→mmol/L'];break;
 case'crp':if(['mg/dl','mgdl'].includes(x))return[v,'identity'];if(['mg/l','mgl'].includes(x))return[v/10,'mg/L→mg/dL'];break;
 case'lymphocyte_percent':case'rdw':if(x==='%'||x==='percent')return[v,'identity'];break;
 case'mcv':if(['fl'].includes(x))return[v,'identity'];break;
 case'alkaline_phosphatase':if(['u/l','ul','iu/l','iul'].includes(x))return[v,'identity'];break;
 case'wbc':if(['10^3/ul','10e3/ul','x10^3/ul','10^9/l','10e9/l','x10^9/l'].includes(x))return[v,'equivalent concentration'];break;
 }throw new Error(`Unsupported unit for ${metric}: ${u}`)}
export function convertLabValue(metric:LabMetric,value:number,unit:string):ConvertedLabValue{if(!Number.isFinite(value))throw new Error('Lab value must be finite');const [v,conversion]=convert(metric,value,unit) as [number,string];const [lo,hi]=ranges[metric];return{metric,inputValue:value,inputUnit:unit,value:v,unit:target[metric],conversion,plausible:v>=lo&&v<=hi}}
