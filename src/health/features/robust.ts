export function median(xs:number[]):number|null{
  if(!xs.length)return null; const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
export function mad(xs:number[]):number|null{
  const m=median(xs); if(m===null)return null;
  return median(xs.map(x=>Math.abs(x-m)));
}
export function robustZ(value:number, baseline:number[], scale=1.4826):number|null{
  const m=median(baseline),d=mad(baseline);
  if(m===null||d===null||d===0)return null;
  return (value-m)/(scale*d);
}
export function coverage(actual:number,expected:number){return expected<=0?0:Math.min(1,actual/expected);}
