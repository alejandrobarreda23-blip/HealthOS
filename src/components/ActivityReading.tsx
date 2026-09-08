import { useMemo, useState } from 'react';
import type { TrainingSession } from '../repositories/activities';
import type { DailyPoint } from '../health/metrics/daily-series';
import { ACTIVITY_READING_VERSION, periodReading, sessionReading, type ReadingPart } from '../health/activity-reading';
import './activity-reading.css';

const STATUS={observed:'Descripción de los registros',comparison:'Comparación personal',limited:'Lectura con datos limitados',pending:'Seguimiento pendiente'};
function Evidence({part}:{part:ReadingPart}) {
  return <details className="activityReadingEvidence"><summary>Datos que sostienen esta lectura</summary><dl>{part.evidence.map((e,i)=><div key={`${e.label}-${i}`}><dt>{e.label}</dt><dd>{e.value}</dd></div>)}</dl></details>;
}
function ReadingMethod() {
  return <details className="activityReadingMethod"><summary>Cómo se elabora · método y referencias</summary>
    <p>El texto se construye con reglas explícitas y los valores de esta selección. Separa volumen registrado, esfuerzo percibido y observaciones diarias. No utiliza el nombre del entrenamiento para deducir su recorrido, ritmo ni resultado.</p>
    <p>Las referencias personales se fijan antes de la sesión, con el mismo cálculo de Body. Una lectura posterior puede añadir seguimiento, pero no modifica la referencia. El corte usa la fecha del dato, no la fecha de importación: es una reconstrucción con los registros disponibles ahora. Los huecos no se rellenan y los cambios de fuente interrumpen la comparación. Diferencia descriptiva no significa diferencia estadísticamente significativa.</p>
    <p>Los mínimos de cinco sesiones para comparar duración y cuatro días para resumir una semana son reglas de presentación de HealthOS; no son umbrales fisiológicos validados. La misma fuente no garantiza que las condiciones de medición sean idénticas.</p>
    <p>El marco general toma como referencia la monitorización multidimensional del entrenamiento. La investigación sobre HRV utiliza protocolos y poblaciones concretos; este texto no reproduce una intervención validada ni prescribe entrenamiento.</p>
    <ul><li><a href="https://pubmed.ncbi.nlm.nih.gov/28463642/" target="_blank" rel="noreferrer">Bourdon et al., 2017 · Consenso sobre monitorización de las cargas de entrenamiento</a></li><li><a href="https://pubmed.ncbi.nlm.nih.gov/26909534/" target="_blank" rel="noreferrer">Vesterinen et al., 2016 · Prescripción individual del entrenamiento con HRV</a></li></ul>
    <small>Método {ACTIVITY_READING_VERSION}. Las referencias orientan el marco; la evidencia de cada frase son tus registros.</small>
  </details>;
}
export function PeriodReading({sessions,end}:{sessions:TrainingSession[];end:string}) {
  const part=useMemo(()=>periodReading(sessions,end),[sessions,end]);
  return <section className="activityReading activityPeriodReading" aria-label="Lectura del periodo">
    <div className="activityReadingHead"><div><span className="eyebrow">INTERPRETAR LOS DATOS</span><h3>Qué cuenta este periodo</h3></div><span className="activityReadingStatus">{STATUS[part.status]}</span></div>
    <div className="activityReadingProse">{part.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div>
    <Evidence part={part}/><ReadingMethod/>
  </section>;
}
export function SessionReading({session,sessions,points,today}:{session:TrainingSession;sessions:TrainingSession[];points:DailyPoint[];today:string}) {
  const [phase,setPhase]=useState('session');
  const [retrospective,setRetrospective]=useState(true);
  const cutoff=retrospective?today:session.physiological_date;
  const parts=useMemo(()=>sessionReading(session,sessions,points,cutoff),[session,sessions,points,cutoff]);
  const active=parts.find(p=>p.id===phase)??parts[0];
  return <section className="activityReading" aria-label="Lectura razonada de la sesión">
    <div className="activityReadingHead"><div><span className="eyebrow">LECTURA RAZONADA</span><h3>La sesión, explicada</h3></div><span className="activityReadingStatus">{STATUS[active.status]}</span></div>
    <div className="activityReadingControls"><div className="activityReadingTabs" aria-label="Parte de la lectura">{parts.map(part=><button key={part.id} aria-pressed={active.id===part.id} onClick={()=>setPhase(part.id)}>{part.id==='session'?'La sesión':part.id==='before'?'Cómo llegabas':'Después'}</button>)}</div><label><input type="checkbox" checked={retrospective} onChange={e=>setRetrospective(e.target.checked)}/> Incluir seguimiento posterior</label></div>
    <p className="activityReadingCutoff">Corte por fecha del dato: {cutoff}. {retrospective?'La referencia previa permanece fija.':'Esta lectura no utiliza días posteriores a la sesión.'}</p>
    <div className="activityReadingProse" aria-live="polite"><h4>{active.title}</h4>{active.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div>
    <Evidence part={active}/>
    <details className="activityReadingLimits"><summary>Qué queda sin resolver</summary><p>Sin series temporales no se describen progresiones de ritmo, intervalos, deriva cardiaca o un final explosivo. Los resúmenes tampoco identifican adaptación, fatiga, recuperación completa ni riesgo individual de lesión. Factores como terreno, calor, nutrición, estrés y otras actividades pueden no estar registrados.</p></details>
    <ReadingMethod/>
  </section>;
}
