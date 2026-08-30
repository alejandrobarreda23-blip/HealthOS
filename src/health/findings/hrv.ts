import { median, mad } from '../features/robust';

export function detectSustainedHrvDrop(last7:number[], baseline:number[]){
  const recent=median(last7),base=median(baseline),dispersion=mad(baseline);
  if(recent===null||base===null||baseline.length<14||last7.length<4)return null;
  const changePct=((recent-base)/base)*100;
  if(changePct>-10)return null;
  return {
    findingKey:'sustained_hrv_drop',
    domain:'recovery',
    title:'HRV por debajo de tu referencia',
    severity:changePct<=-20?'high':changePct<=-15?'moderate':'low',
    confidence:Math.min(.98,.55+Math.min(baseline.length,42)/100+Math.min(last7.length,7)/50),
    detectorVersion:'hrv-drop-v1',
    evidence:{recentMedian:recent,baselineMedian:base,mad:dispersion,changePct}
  };
}
