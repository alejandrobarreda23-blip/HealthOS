import { useMemo, useState } from 'react';
import type { TrainingSession } from '../repositories/activities';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { localToday, minusDays, type DailyPoint } from '../health/metrics/daily-series';
import { CONTEXT_METRICS, contextDates, contextSignal, contextTraining, trainingTotals } from '../health/activity-context';
import { durationLabel, numberLabel, sportLabel } from '../health/activities';
import './activity-context.css';

export default function ActivityContext({ session, sessions, onOpenBody }: { session: TrainingSession; sessions: TrainingSession[]; onOpenBody: (date: string) => void }) {
  const today = localToday();
  const end = minusDays(session.physiological_date,-7);
  const history = useBodyHistory(end < today ? end : today,36);
  return <><h3>El entrenamiento en contexto</h3>
    {history.loading && <p role="status">Preparando la historia alrededor de esta sesión…</p>}
    {history.error && <p role="alert">{history.error} <button onClick={history.refresh}>Reintentar</button></p>}
    {!history.loading && !history.error && <ActivityContextView session={session} sessions={sessions} points={history.data?.points ?? []} today={today} onOpenBody={onOpenBody}/>}
  </>;
}
const signed = (value: number | null, unit: string) => value === null ? 'Sin comparación suficiente' : `${value > 0 ? '+' : ''}${value.toLocaleString('es-ES',{maximumFractionDigits:1})} ${unit}`;
const X = (i: number) => 40+i*20;
const chartWidth = 780;
const yPosition = (v: number, min: number, max: number) => 91-(v-min)/(max-min)*65;
export function ActivityContextView({ session, sessions, points, today, onOpenBody }: { session: TrainingSession; sessions: TrainingSession[]; points: DailyPoint[]; today: string; onOpenBody: (date: string) => void }) {
  const date = session.physiological_date;
  const [activeDate,setActiveDate] = useState(date);
  const [trainingMetric,setTrainingMetric] = useState<'seconds'|'elevation'>('seconds');
  const dates = useMemo(() => contextDates(date),[date]);
  const training = useMemo(() => contextTraining(session,sessions,today),[session,sessions,today]);
  const signals = useMemo(() => CONTEXT_METRICS.map(metric => ({...metric,...contextSignal(points,metric.key,date,today)})),[points,date,today]);
  const activeIndex = Math.max(0,dates.indexOf(activeDate));
  const activeTraining = training.days[activeIndex];
  const afterDays = dates.filter(d => d > date && d <= today).length;
  const trainingValues = training.days.map(day => trainingTotals(day.sessions)[trainingMetric]);
  const trainingMax = Math.max(1,...trainingValues.filter((v): v is number => v !== null));
  const sportColors = ['#477263','#a78150','#747296','#52889a','#a96869','#687b4e'];
  const sports = [...new Set(training.days.flatMap(d => d.sessions.map(s => s.activity_type)))].sort();
  const activate = (event: React.PointerEvent<SVGSVGElement>) => {
    const box=event.currentTarget.getBoundingClientRect();
    const i=Math.max(0,Math.min(35,Math.round(((event.clientX-box.left)/box.width*chartWidth-40)/20)));
    setActiveDate(dates[i]);
  };
  const markers = () => <>
    <line x1={X(28)} x2={X(28)} y1="8" y2="108" stroke="#254c3b" strokeWidth="2" strokeDasharray="4 3"/>
    <line x1={X(activeIndex)} x2={X(activeIndex)} y1="8" y2="108" stroke="#aa6b34" opacity=".75"/>
    {dates.map((d,i) => d > today ? <rect key={d} x={X(i)-9} y="12" width="18" height="90" fill="#dfe2dd" opacity=".6"/> : null)}
  </>;
  return <div className="contextExplorer">
    <p>28 días antes · sesión · 7 días después. Las señales son observaciones diarias, no mediciones inmediatamente antes o después del esfuerzo.</p>
    <div className="contextOverview">
      <div><span>7 días anteriores</span><strong>{durationLabel(training.previous7.seconds)}</strong><small>{training.previous7.count} sesiones registradas · {training.previous7.durationCount}/{training.previous7.count} con duración</small></div>
      <div><span>28 días anteriores</span><strong>{durationLabel(training.previous28.seconds)}</strong><small>{numberLabel(training.previous28.elevation,'m D+')} · {training.previous28.elevationCount}/{training.previous28.count} sesiones con desnivel</small></div>
      <div><span>Bloque de {sportLabel(session.activity_type)}</span><strong>Jornada {training.consecutive}</strong><small>Días consecutivos con este deporte hasta la sesión</small></div>
    </div>
    <div className="contextInsights">
      <details><summary>{training.consecutive > 1 ? `Esta sesión llega tras ${training.consecutive-1} días consecutivos de ${sportLabel(session.activity_type)}.` : 'No hay otra jornada de este deporte registrada el día anterior.'}</summary><p>Se cuentan fechas consecutivas con al menos una sesión del mismo deporte, terminando el {date}. Ausencia de una sesión registrada no demuestra descanso. No se utiliza entrenamiento posterior.</p></details>
      {training.share !== null && <details><summary>Representa el {Math.round(training.share)} % de la duración registrada en los 7 días hasta esta sesión.</summary><p>Denominador: {durationLabel(trainingTotals(training.trailing).seconds)} en {training.trailing.length} sesiones, desde {minusDays(date,6)} hasta el inicio de esta sesión, incluyéndola. Se suman todos los deportes y la duración guardada; no es una medida de carga fisiológica.</p></details>}
      <details><summary>{afterDays < 7 ? `Seguimiento aún parcial: han transcurrido ${afterDays} de los 7 días posteriores.` : `${training.after.length} sesiones registradas en los 7 días posteriores.`}</summary><p>El seguimiento termina el {minusDays(date,-7)}. Otros entrenamientos y factores no registrados pueden coincidir con los cambios observados. Cada señal informa por separado de su cobertura.</p></details>
    </div>
    <div className="contextChartHeader"><div><h3>Historia sincronizada</h3><small>Línea discontinua: sesión · banda: 50 % central de la referencia previa</small></div><label>Entrenamiento<select value={trainingMetric} onChange={e=>setTrainingMetric(e.target.value as 'seconds'|'elevation')}><option value="seconds">Duración</option><option value="elevation">Desnivel</option></select></label></div>
    <div className="contextDateControl"><label htmlFor={`context-${session.id}`}>Explorar día: <strong>{activeDate}</strong>{activeDate > today ? ' · pendiente' : ''}</label><input id={`context-${session.id}`} type="range" min="0" max="35" step="1" value={activeIndex} onChange={e=>setActiveDate(dates[Number(e.target.value)])} aria-valuetext={activeDate}/><button onClick={()=>setActiveDate(date)}>Volver a la sesión</button></div>
    <div className="contextCharts">
      <div className="contextChartRow"><div className="contextChartLabel"><strong>Entrenamiento</strong><span>{activeDate > today ? 'Pendiente' : activeTraining.sessions.length ? trainingMetric === 'seconds' ? durationLabel(trainingValues[activeIndex]) : numberLabel(trainingValues[activeIndex],'m D+') : 'Sin sesiones registradas'}</span></div>
        <svg preserveAspectRatio="none" viewBox={`0 0 ${chartWidth} 125`} onPointerMove={activate} onPointerDown={activate} role="img" aria-label="Entrenamientos diarios por deporte; usa el selector de día para consultar los valores">
          {markers()}{training.days.map((day,i)=>{
            let stacked=0;
            return sports.map(sport=>{
              const total=trainingTotals(day.sessions.filter(s=>s.activity_type===sport))[trainingMetric];
              if(total===null)return null;
              const height=total/trainingMax*70; stacked+=height;
              return <rect key={`${day.date}-${sport}`} x={X(i)-6} y={102-stacked} width="12" height={Math.max(height,1)} rx="2" fill={sportColors[sports.indexOf(sport)%sportColors.length]}><title>{day.date} · {sportLabel(sport)} · {trainingMetric==='seconds'?durationLabel(total):numberLabel(total,'m')}</title></rect>;
            });
          })}<text x="8" y="18">{trainingMetric==='seconds'?durationLabel(trainingMax):numberLabel(trainingMax,'m')}</text>
        </svg>
      </div>
      <div className="contextSportLegend">{sports.map((sport,i)=><span key={sport}><i style={{background:sportColors[i%sportColors.length]}}/>{sportLabel(sport)}</span>)}</div>
      {signals.map(signal=>{
        const point=signal.points.find(p=>p.physiologicalDate===activeDate);
        const band=signal.reference.sufficient && Boolean(signal.evaluation.latest?.provider);
        const values=[...signal.points.map(p=>p.value),...(band?[signal.reference.p25!,signal.reference.p75!]:[])];
        const low=values.length?Math.min(...values):0, high=values.length?Math.max(...values):1;
        const padding=Math.max((high-low)*.15,1), min=low-padding,max=high+padding;
        const y=(value:number)=>yPosition(value,min,max);
        return <div className="contextChartRow" key={signal.key}>
          <div className="contextChartLabel"><strong>{signal.label}</strong><span>{point?numberLabel(point.value,signal.unit):activeDate>today?'Pendiente':'Sin dato'}</span><small>{point?.provider ?? ''}{point && !signal.comparable(point) ? ' · sin comparación con la referencia' : ''}</small></div>
          <svg preserveAspectRatio="none" viewBox={`0 0 ${chartWidth} 125`} onPointerMove={activate} onPointerDown={activate} role="img" aria-label={`${signal.label}: observaciones diarias, huecos y referencia anterior a la sesión`}>
            {band && dates.map((d,i)=>{const p=signal.points.find(p=>p.physiologicalDate===d); return p && signal.comparable(p)?<rect key={d} x={X(i)-10} width="20" y={y(signal.reference.p75!)} height={Math.max(1,y(signal.reference.p25!)-y(signal.reference.p75!))} fill={signal.color} opacity=".12"/>:null;})}
            {markers()}
            {signal.points.map((p,i)=>{const index=dates.indexOf(p.physiologicalDate), previous=signal.points[i-1];return <g key={p.physiologicalDate}>
              {previous && previous.physiologicalDate===minusDays(p.physiologicalDate,1) && previous.sourceKey===p.sourceKey && <line x1={X(index-1)} y1={y(previous.value)} x2={X(index)} y2={y(p.value)} stroke={signal.color} strokeWidth="2"/>}
              <circle cx={X(index)} cy={y(p.value)} r={activeDate===p.physiologicalDate?5:3} fill={signal.color}><title>{p.physiologicalDate}: {numberLabel(p.value,signal.unit)} · {p.provider ?? 'fuente desconocida'}</title></circle>
            </g>;})}
            {dates.map((d,i)=>!signal.points.some(p=>p.physiologicalDate===d)&&d<=today?<text key={d} x={X(i)} y="105" textAnchor="middle" fill="#8c948c">×</text>:null)}
            <text x="4" y="18">{numberLabel(high,signal.unit)}</text><text x="4" y="119">{numberLabel(low,signal.unit)}</text>
          </svg>
          <small className="contextChartFoot">{values.length ? `Rango visible: ${numberLabel(low,signal.unit)} – ${numberLabel(high,signal.unit)}. ` : ''}{signal.sourceChanged?'Cambio de fuente: la curva se interrumpe. ':''}{band?'Referencia fijada antes de la sesión.':'Sin referencia suficiente: se muestran las observaciones.'} × Sin dato diario.</small>
        </div>;
      })}
      <div className="contextAxis"><span>{dates[0]} · −28 d</span><strong>{date} · sesión</strong><span>{dates[35]} · +7 d</span></div>
    </div>
    <div className="contextDay"><strong>{activeDate} · detalle del día</strong><p>{activeTraining.sessions.length?activeTraining.sessions.map(s=>sportLabel(s.activity_type)).join(' · '):activeDate>today?'Fecha futura.':'Sin entrenamientos registrados.'}</p>
      <button disabled={activeDate>today || activeDate<minusDays(today,364)} onClick={()=>onOpenBody(activeDate)}>Abrir este día en Cuerpo</button>
    </div>
    <h3>Cómo llegabas y qué se observó después</h3><p>Comparación de las medianas de los 7 días anteriores y posteriores con una referencia fija. Se requieren al menos 4 días comparables por ventana y una referencia suficiente. No es una valoración de recuperación.</p>
    <div className="contextSignalCards">{signals.map(signal=><article key={signal.key}><h4>{signal.label}</h4><div className="contextBeforeAfter"><div><small>Antes · {signal.before.count}/7 días con dato</small><strong>{signed(signal.before.delta,signal.unit)}</strong></div><div><small>Después · {signal.after.count}/7 días con dato</small><strong>{signed(signal.after.delta,signal.unit)}</strong></div></div>
      <details><summary>Ver referencia y evidencia</summary><p>Referencia: {signal.evaluation.referenceStart} → {signal.evaluation.referenceEnd}. {signal.reference.sampleCount}/{signal.reference.windowDays} días válidos. Mediana: {numberLabel(signal.reference.median,signal.unit)}. {signal.reference.sufficient?'Cobertura suficiente.':'Cobertura insuficiente.'}</p><p>Antes: {minusDays(date,7)} → {minusDays(date,1)}. Después: {minusDays(date,-1)} → {minusDays(date,-7)}. Días comparables: {signal.before.comparableCount} antes y {signal.after.comparableCount} después. La sesión no pertenece a ninguna de las dos ventanas.</p><p>Fuente de referencia: {signal.evaluation.latest?.provider ?? 'desconocida'}. Método: misma serie diaria y referencia de Body, fijadas el día anterior. Un cambio de fuente impide comparar el nuevo tramo.</p><div className="activityTableWrap"><table><thead><tr><th>Fecha</th><th>Valor</th><th>Fuente</th></tr></thead><tbody>{[...new Map([...signal.referenceRows,...signal.points].map(p=>[p.physiologicalDate,p])).values()].sort((a,b)=>a.physiologicalDate.localeCompare(b.physiologicalDate)).map(p=><tr key={p.physiologicalDate}><td>{p.physiologicalDate}</td><td>{numberLabel(p.value,signal.unit)}</td><td>{p.provider ?? 'desconocida'}<details><summary>Registro</summary>{p.observationIds.join(', ') || 'Sin identificador'}<br/>{p.sourceKey}</details></td></tr>)}</tbody></table></div></details>
    </article>)}</div>
    <p className="activityNote">La cobertura de importación de entrenamientos no está certificada: los totales describen las sesiones registradas. Las diferencias entre señales y entrenamiento son asociaciones temporales; no establecen causa ni diagnóstico.</p>
  </div>;
}
