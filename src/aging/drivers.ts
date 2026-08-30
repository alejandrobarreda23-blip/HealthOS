import type{AgingDriver}from'./types';
export function deriveAgingDrivers(f:Record<string,number|null>):AgingDriver[]{
 const out:AgingDriver[]=[];
 const add=(key:string,label:string,domain:string,direction:AgingDriver['direction'],confidence:number,reason:string,magnitude?:number)=>out.push({key,label,domain,direction,confidence,reason,magnitude});
 if(f.vo2max_percentile!=null)add('cardiorespiratory_fitness','Fitness cardiorrespiratorio','fitness',f.vo2max_percentile>=70?'favorable':f.vo2max_percentile<30?'unfavorable':'neutral',.8,`Percentil estimado ${Math.round(f.vo2max_percentile)}`,f.vo2max_percentile);
 if(f.sleep_regularity!=null)add('sleep_regularity','Regularidad del sueño','sleep',f.sleep_regularity>=.8?'favorable':f.sleep_regularity<.6?'unfavorable':'neutral',.7,`Regularidad ${(f.sleep_regularity*100).toFixed(0)}%`,f.sleep_regularity);
 if(f.systolic_bp!=null)add('blood_pressure','Presión arterial','cardiovascular',f.systolic_bp<120?'favorable':f.systolic_bp>=140?'unfavorable':'neutral',.75,`Sistólica ${Math.round(f.systolic_bp)} mmHg`,f.systolic_bp);
 if(f.alcohol_days_30d!=null)add('alcohol_exposure','Alcohol','behavior',f.alcohol_days_30d===0?'favorable':f.alcohol_days_30d>=12?'unfavorable':'neutral',.65,`${Math.round(f.alcohol_days_30d)} días con exposición / 30`,f.alcohol_days_30d);
 return out;
}