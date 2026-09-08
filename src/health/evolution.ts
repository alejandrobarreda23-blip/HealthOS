import { median, minusDays } from './metrics/daily-series';
import type { TrendPointV1 } from '../repositories/trends';

function identified(key?: string) {
  if (!key) return false;
  try { const parts = JSON.parse(key); return Array.isArray(parts) && Boolean(parts[0]) && parts[0] !== 'unknown'; } catch { return false; }
}

export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a,b) => a-b), at = (s.length-1)*q, lo = Math.floor(at);
  return s[lo] + (s[Math.ceil(at)]-s[lo])*(at-lo);
}
export function periodSummary(points: TrendPointV1[], end: string, days = 28) {
  const start = minusDays(end, days-1), rows = points.filter(p => p.date >= start && p.date <= end);
  const values = rows.map(p => p.value);
  return { start, end, count: rows.length, median: median(values), q25: quantile(values,.25), q75: quantile(values,.75), rows };
}
/** Descriptive comparison only. Reject source switches, including A→B→A. */
export function compareEvolution(points: TrendPointV1[], end: string, minimum = 14) {
  const recent = periodSummary(points,end), previous = periodSummary(points,minusDays(end,28));
  const rows = [...previous.rows,...recent.rows];
  const known = rows.length > 0 && rows.every(p => identified(p.sourceKey));
  const sameSource = known && new Set(rows.map(p=>p.sourceKey)).size === 1;
  const enough = recent.count >= minimum && previous.count >= minimum;
  const eligible = sameSource && enough;
  return { recent, previous, eligible, minimum, delta: eligible ? recent.median! - previous.median! : null,
    reason: !sameSource ? 'Fuente no identificada o cambios de fuente entre periodos.' : !enough ? `Se necesitan al menos ${minimum} días observados en cada periodo.` : 'Comparación descriptiva entre periodos de la misma fuente.' };
}
/** Trailing median: no value on unobserved dates, no bridge across missing days or source switches. */
export function evolutionSmoothing(points: TrendPointV1[], minimum = 4) {
  const out: (TrendPointV1 & { count: number })[][] = []; let segment: (TrendPointV1 & { count: number })[] = [];
  let sourceStart = 0;
  for (let i=0;i<points.length;i++) {
    const p=points[i]; if (i && p.sourceKey !== points[i-1].sourceKey) sourceStart=i;
    const recent=points.slice(sourceStart,i+1).filter(r=>r.date>=minusDays(p.date,6));
    const valid=recent.length>=minimum && identified(p.sourceKey);
    if (!valid || (segment.length && minusDays(p.date,1)!==segment.at(-1)!.date)) { if(segment.length)out.push(segment); segment=[]; }
    if(valid)segment.push({...p,value:median(recent.map(r=>r.value))!,count:recent.length});
  }
  if(segment.length)out.push(segment); return out;
}
