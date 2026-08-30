export function daysBetween(a:string,b:string){
 return Math.abs(new Date(b+'T12:00:00Z').getTime()-new Date(a+'T12:00:00Z').getTime())/86400000;
}
export function linearSlope(points:{date:string;value:number}[]){
 if(points.length<2)return null;
 const t0=new Date(points[0].date+'T12:00:00Z').getTime();
 const xs=points.map(p=>(new Date(p.date+'T12:00:00Z').getTime()-t0)/86400000);
 const ys=points.map(p=>p.value);
 const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length;
 const num=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0),den=xs.reduce((s,x)=>s+(x-mx)**2,0);
 return den===0?null:num/den;
}
export function normalizedTrend(points:{date:string;value:number}[]){
 const s=linearSlope(points); if(s===null)return null;
 const mean=points.reduce((a,b)=>a+b.value,0)/points.length;
 return mean===0?null:(s/Math.abs(mean))*365.2425; // fractional change / year
}
