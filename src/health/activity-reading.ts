import type { TrainingSession } from '../repositories/activities';
import { durationLabel, nonnegative, numberLabel, sessionSeconds, sportLabel } from './activities';
import { CONTEXT_METRICS, comparableActivities, contextSignal, contextTraining, trainingTotals } from './activity-context';
import { median, minusDays, type DailyPoint } from './metrics/daily-series';

export const ACTIVITY_READING_VERSION = 'activity_reading_v1';
export interface ReadingEvidence { label: string; value: string }
export interface ReadingPart {
  id: string; title: string; paragraphs: string[]; status: 'observed' | 'comparison' | 'limited' | 'pending';
  evidence: ReadingEvidence[];
}
const numeric = (value: number) => value.toLocaleString('es-ES',{maximumFractionDigits:1});
const rowsEvidence = (rows: TrainingSession[]): ReadingEvidence[] => rows.map(s => ({label:`${s.physiological_date} · ${sportLabel(s.activity_type)}`,value:`${durationLabel(sessionSeconds(s))} · sesión ${s.id}`}));
const counted = (n: number, one: string, many: string) => `${n} ${n===1?one:many}`;
const unique = (rows: TrainingSession[]) => [...new Map(rows.map(s=>[s.id,s])).values()];

export function periodReading(input: TrainingSession[], end: string): ReadingPart {
  const start=minusDays(end,27);
  const rows=unique(input).filter(s=>s.physiological_date>=start && s.physiological_date<=end);
  const total=trainingTotals(rows);
  if(!rows.length)return {id:'period',title:'Lectura del periodo',status:'limited',paragraphs:['No hay sesiones registradas en este periodo para elaborar una lectura.'],evidence:[{label:'Periodo',value:`${start} → ${end}`}]};
  const complete=total.durationCount===rows.length && total.seconds!==null && total.seconds>0;
  const sports=[...new Set(rows.map(s=>s.activity_type))].map(sport=>({sport,total:trainingTotals(rows.filter(s=>s.activity_type===sport))}));
  const dominant=[...sports].sort((a,b)=>(b.total.seconds??0)-(a.total.seconds??0)||a.sport.localeCompare(b.sport))[0];
  const multiDays=[...new Set(rows.map(s=>s.physiological_date))].filter(d=>rows.filter(s=>s.physiological_date===d).length>1).length;
  let volume=`Entre ${start} y ${end} ${rows.length===1?'consta':'constan'} ${counted(rows.length,'sesión','sesiones')} en ${counted(total.days,'día','días')}`;
  volume+=total.seconds!==null?`, con ${durationLabel(total.seconds)} de duración registrada.`:'. No hay duraciones válidas para sumar el tiempo.';
  if(complete && dominant.total.seconds!==null) volume+=` ${sportLabel(dominant.sport)} concentra el ${Math.round(dominant.total.seconds/total.seconds!*100)} % del tiempo (${durationLabel(dominant.total.seconds)}).`;
  if(!complete) volume+=` Hay duración válida en ${total.durationCount}/${rows.length} sesiones; el total es parcial.`;
  if(multiDays)volume+=` En ${counted(multiDays,'día','días')} aparece más de una sesión.`;
  const windows=Array.from({length:22},(_,i)=>{
    const windowStart=minusDays(end,27-i),windowEnd=minusDays(windowStart,-6);
    return {start:windowStart,end:windowEnd,total:trainingTotals(rows.filter(s=>s.physiological_date>=windowStart&&s.physiological_date<=windowEnd))};
  }).sort((a,b)=>(b.total.seconds??0)-(a.total.seconds??0)||a.start.localeCompare(b.start));
  const peak=windows[0];
  const distribution=complete && peak.total.seconds!==null
    ? `El tramo de siete días con más tiempo registrado es ${peak.start}–${peak.end}: ${durationLabel(peak.total.seconds)}, un ${Math.round(peak.total.seconds/total.seconds!*100)} % del periodo. Esta concentración ayuda a situar cada sesión dentro de la acumulación de trabajo. No permite estimar por sí sola fatiga o riesgo de lesión.`
    : 'La duración incompleta impide describir con el mismo criterio cómo se distribuye el tiempo entre semanas. Los días sin sesiones importadas tampoco permiten confirmar descanso.';
  const rpe=rows.map(s=>s.summary?.rpe).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=1&&n<=10);
  const effort=rpe.length
    ? `El esfuerzo percibido está registrado en ${rpe.length}/${rows.length} sesiones; su mediana es ${numeric(median(rpe)!)} sobre 10. ${rpe.length<rows.length?'Esa mediana describe únicamente las sesiones valoradas: no sabemos si las que faltan tuvieron un esfuerzo parecido.':'Es un resumen de valoraciones subjetivas de sesiones, sin ponderar su duración.'} El tiempo acumulado y el esfuerzo percibido describen dimensiones distintas del entrenamiento.`
    : 'No hay esfuerzo percibido registrado. El volumen permite describir cuánto entrenamiento consta, pero no cómo se vivió el esfuerzo. La intensidad calculada por el proveedor se mantiene como otra medida, sin sustituir esta valoración.';
  return {id:'period',title:'Lectura del periodo',status:complete?'observed':'limited',paragraphs:[volume,distribution,effort],evidence:[
    {label:'Selección',value:`${start} → ${end}. Respeta los filtros de deporte, búsqueda y fechas del panorama.`},
    {label:'Duración',value:`Suma del intervalo guardado de ${total.durationCount}/${rows.length} sesiones. Los huecos no se rellenan.`},
    {label:'Concentración semanal',value:'Máximo de las 22 ventanas consecutivas de siete días contenidas en el periodo de 28 días; los empates usan la primera ventana.'},
    {label:'Esfuerzo percibido',value:`Mediana sin ponderar de ${rpe.length} valores RPE de 1 a 10. No se utiliza la intensidad calculada para completar valores ausentes.`},
    ...rowsEvidence(rows),
  ]};
}

export function sessionReading(session: TrainingSession, input: TrainingSession[], inputPoints: DailyPoint[], asOfDate: string): ReadingPart[] {
  const date=session.physiological_date;
  if(asOfDate<date)return [{id:'session',title:'La sesión aún no ha ocurrido',status:'pending',paragraphs:['La fecha de corte es anterior a la sesión; no se elabora una lectura retrospectiva.'],evidence:[]}];
  const rows=unique(input).filter(s=>s.physiological_date<=asOfDate);
  const points=inputPoints.filter(p=>p.physiologicalDate<=asOfDate);
  const training=contextTraining(session,rows,asOfDate);
  const peers=comparableActivities(session,rows);
  const durations=peers.map(sessionSeconds).filter((v):v is number=>v!==null);
  const seconds=sessionSeconds(session), middle=median(durations);
  const comparable=seconds!==null&&middle!==null&&middle>0&&durations.length>=5;
  const distance=nonnegative(session.distance_m), elevation=nonnegative(session.elevation_gain_m);
  let description=`La sesión de ${sportLabel(session.activity_type)} del ${date} ${seconds===null?'no tiene una duración válida':`registra ${durationLabel(seconds)}`}`;
  if(distance!==null)description+=`, ${numberLabel(distance,'km',1000)}`;
  if(elevation!==null)description+=` y ${numberLabel(elevation,'m de desnivel positivo')}`;
  description+='.';
  const comparison=comparable
    ? `Su duración representa el ${numeric(seconds!/middle!*100)} % de la mediana de ${durations.length} sesiones anteriores del mismo deporte y fuente, con la misma etiqueta de dispositivo (${durationLabel(middle)}). Esta comparación sitúa el volumen de la salida dentro de tu historial; las rutas y las condiciones pueden ser distintas.${!session.source_device?' El dispositivo no está identificado: no puede confirmarse que sea el mismo sensor.':''}`
    : `Hay ${counted(durations.length,'sesión anterior','sesiones anteriores')} con duración utilizable del mismo deporte y fuente, con la misma etiqueta de dispositivo. ${durations.length<5?'Se requieren cinco para esta comparación descriptiva.':'La duración de la sesión o la mediana anterior no permiten calcular una razón válida.'} No se califica la salida como habitual o excepcional.`;
  const rpe=session.summary?.rpe;
  const effort=typeof rpe==='number'&&Number.isFinite(rpe)&&rpe>=1&&rpe<=10
    ? `El esfuerzo percibido registrado es ${numeric(rpe)}/10. Es una valoración subjetiva de esta sesión; no identifica qué tramos fueron más exigentes.`
    : 'No consta esfuerzo percibido para esta sesión. La duración y la FC media no bastan para reconstruirlo.';
  const first:ReadingPart={id:'session',title:'Qué representa esta sesión',status:comparable?'comparison':'limited',paragraphs:[description,comparison,effort],evidence:[
    {label:'Sesión',value:session.id},
    {label:'Fuente y dispositivo',value:`${session.provider} · ${session.source_device??'no identificado'}`},
    {label:'Comparador',value:`${minusDays(date,90)} → ${minusDays(date,1)}. Mismo deporte exacto, proveedor y dispositivo; excluye la sesión, su día y cualquier dato posterior. Mínimo de cinco duraciones: regla de producto, no umbral fisiológico.`},
    ...rowsEvidence(peers),
  ]};
  const signals=CONTEXT_METRICS.map(m=>({...m,...contextSignal(points,m.key,date,asOfDate)}));
  const signalSentences=(phase:'before'|'after')=>signals.filter(s=>s[phase].value!==null&&s[phase].delta!==null).map(s=>{
    const delta=s[phase].delta!;
    const rounded=Math.round(delta*10)/10;
    return `${s.label}: mediana ${numberLabel(s[phase].value,s.unit)} en ${s[phase].comparableCount}/7 días comparables, ${rounded===0?'igual a la referencia al redondear a una décima':`${numeric(Math.abs(rounded))} ${s.unit} ${rounded>0?'por encima':'por debajo'} de la mediana de referencia`}.`;
  });
  const signalEvidence=(phase:'before'|'after'):ReadingEvidence[]=>signals.flatMap(s=>[
    {label:`${s.label} · referencia fija`,value:`${s.evaluation.referenceStart} → ${s.evaluation.referenceEnd}; ${s.reference.sampleCount}/${s.reference.windowDays} días válidos; mediana ${numberLabel(s.reference.median,s.unit)}. ${s.reference.sufficient?'Referencia suficiente.':'Referencia insuficiente.'}`},
    {label:`${s.label} · cobertura de la ventana`,value:`${s[phase].count}/7 días con dato; ${s[phase].comparableCount}/7 comparables con la referencia. Se requieren cuatro comparables y una referencia suficiente. ${new Set(s.points.filter(p=>phase==='before'?p.physiologicalDate<date:true).map(p=>p.sourceKey)).size>1?'Hay cambios de fuente en los datos examinados.':''}`},
    {label:`${s.label} · registros examinados (referencia y ventana)`,value:[...new Set([...s.referenceRows,...s.points.filter(p=>phase==='before'?p.physiologicalDate>=minusDays(date,7)&&p.physiologicalDate<date:p.physiologicalDate>date)].flatMap(p=>p.observationIds))].join(', ')||'Sin identificadores disponibles'},
  ]);
  const beforeSignals=signalSentences('before');
  const prior=training.previous7;
  const priorText=prior.count
    ? `En los siete días anteriores ${prior.count===1?'consta':'constan'} ${counted(prior.count,'sesión','sesiones')} en ${counted(prior.days,'día','días')}, con ${durationLabel(prior.seconds)} de duración registrada (${prior.durationCount}/${prior.count} sesiones con duración).`
    : 'No hay sesiones registradas en los siete días anteriores. Esto no permite asumir que fueran días de descanso.';
  const continuity=training.consecutive>1
    ? `Esta es la jornada ${training.consecutive} consecutiva con ${sportLabel(session.activity_type)}. La sesión forma parte de un bloque de días seguidos y debe leerse junto a ese trabajo previo.`
    : 'No consta otra jornada del mismo deporte el día anterior; pueden existir sesiones de otros deportes o actividad no importada.';
  const before:ReadingPart={id:'before',title:'Cómo llegabas',status:beforeSignals.length?'comparison':'limited',paragraphs:[`${priorText} ${continuity}`,
    beforeSignals.length?beforeSignals.join(' '):'La cobertura o la comparabilidad de las señales no permite resumir la semana previa frente a una referencia personal suficiente.',
    'Estas observaciones describen el contexto previo. No convierten la HRV, el pulso o el sueño en una medida única de preparación para entrenar.'],evidence:[
      {label:'Ventana previa',value:`${minusDays(date,7)} → ${minusDays(date,1)}. La sesión y los días posteriores quedan excluidos.`},...rowsEvidence(training.previous7Sessions),...signalEvidence('before'),
    ]};
  const elapsed=Math.min(7,Math.max(0,Math.round((Date.parse(`${asOfDate}T12:00:00Z`)-Date.parse(`${date}T12:00:00Z`))/86400000)));
  const afterSignals=signalSentences('after');
  const after:ReadingPart={id:'after',title:'Qué se observa después',status:elapsed===0?'pending':afterSignals.length?'comparison':'limited',paragraphs:[
    elapsed===0?'En esta fecha de corte todavía no hay días posteriores a la sesión. No se emite una conclusión sobre recuperación.'
      :`${elapsed<7?`Han transcurrido ${elapsed} de los siete días de seguimiento; la lectura es parcial.`:'La ventana de siete días de seguimiento ha terminado.'} ${afterSignals.length?afterSignals.join(' '):'No hay suficientes días comparables para resumir las señales posteriores frente a su referencia.'}`,
    elapsed>0?`${training.after.length?`Durante ese seguimiento ${training.after.length===1?'consta otra sesión':`constan otras ${training.after.length} sesiones`} de entrenamiento.`:'No constan otras sesiones durante el seguimiento disponible.'} Los cambios observados coinciden en el tiempo con la sesión y su contexto; no se puede atribuirles una causa ni deducir un tiempo de recuperación.`:'El seguimiento se podrá ampliar cuando se importen datos de los días siguientes.',
  ],evidence:[{label:'Corte de la lectura',value:asOfDate},{label:'Seguimiento previsto',value:`${minusDays(date,-1)} → ${minusDays(date,-7)}. ${elapsed}/7 días transcurridos; la cobertura se evalúa por señal.`},...rowsEvidence(training.after),...signalEvidence('after')]};
  return [first,before,after];
}
