import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrainingSession } from '../repositories/activities';
import { sportLabel } from '../health/activities';
import type { ActivityColorMode } from '../health/activity-presentation';
import ActivityOverview from './ActivityOverview';
import ActivitySessionCard from './ActivitySessionCard';
import { ActivityDetail } from './ActivityDetail';
import HeartRateSettings from './HeartRateSettings';
import CyclingClimbs from './CyclingClimbs';
import '../screens/activities.css';
import './activity-hub.css';

export default function ActivityBrowser({ sessions, userId, initialDate='', loading=false, error='', metadataError='', refresh, onOpenBody }: {
  sessions: TrainingSession[]; userId?: string; initialDate?: string; loading?: boolean; error?: string; metadataError?: string; refresh: () => void; onOpenBody: (date:string) => void;
}) {
  const [view,setView]=useState<'sessions'|'climbs'>('sessions');
  const [sport,setSport]=useState('');
  const [from,setFrom]=useState(initialDate);
  const [to,setTo]=useState(initialDate);
  const [search,setSearch]=useState('');
  const [selectedId,setSelectedId]=useState('');
  const [activeDay,setActiveDay]=useState('');
  const [colorMode,setColorMode]=useState<ActivityColorMode>('intensity');
  const [limit,setLimit]=useState(24);
  const resultsRef=useRef<HTMLDivElement>(null);
  const pendingOpen=useRef('');
  const sports=useMemo(()=>[...new Set(sessions.map(s=>s.activity_type))].sort((a,b)=>sportLabel(a).localeCompare(sportLabel(b))),[sessions]);
  const base=useMemo(()=>sessions.filter(s=>(!sport||s.activity_type===sport)&&(!from||s.physiological_date>=from)&&(!to||s.physiological_date<=to)&&(!search||`${s.summary?.name??''} ${sportLabel(s.activity_type)} ${s.physiological_date}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))).sort((a,b)=>b.started_at.localeCompare(a.started_at)||a.id.localeCompare(b.id)),[sessions,sport,from,to,search]);
  const filtered=activeDay?base.filter(s=>s.physiological_date===activeDay):base;
  const selected=filtered.find(s=>s.id===selectedId);
  useEffect(()=>{if(selectedId)resultsRef.current?.scrollIntoView({block:'start'});},[selectedId]);
  useEffect(()=>{setActiveDay('');setSelectedId('');setLimit(24);},[sport,from,to,search]);
  useEffect(()=>{if(view==='sessions'&&pendingOpen.current){setSelectedId(pendingOpen.current);pendingOpen.current='';}},[view,sport,from,to,search]);
  const clear=()=>{setSport('');setFrom('');setTo('');setSearch('');setActiveDay('');setSelectedId('');setLimit(24);};
  return <div className="activitiesScreen activityHub">
    <HeartRateSettings/>
    <header className="activityHubHeader"><div><div className="eyebrow">HEALTHOS · ENTRENAMIENTO</div><h1>Tu historia en movimiento</h1><p>Explora tus sesiones, reconoce sus diferencias y abre el contexto que las rodea.</p></div><button className="secondary" onClick={refresh} disabled={loading}>Actualizar</button></header>
    <div className="cyclingViewTabs"><button aria-pressed={view==='sessions'} onClick={()=>setView('sessions')}>Sesiones</button><button aria-pressed={view==='climbs'} onClick={()=>setView('climbs')}>Evolución en subidas</button></div>
    {view==='climbs'?<>{loading?<p>Cargando actividades…</p>:error?<p role="alert">{error}</p>:<CyclingClimbs sessions={sessions} onOpen={id=>{pendingOpen.current=id;clear();setView('sessions');}}/>}</>:<>
    <div className="activityHubToolbar"><label className="activitySearch">Buscar entrenamiento<input type="search" placeholder="Nombre, deporte o fecha…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Deporte<select value={sport} onChange={e=>setSport(e.target.value)}><option value="">Todos los deportes</option>{sports.map(s=><option key={s} value={s}>{sportLabel(s)}</option>)}</select></label><label>Desde<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button onClick={clear}>Ver todo</button></div>
    <div className="activityColorLegend"><label>Colorear por<select value={colorMode} onChange={e=>setColorMode(e.target.value as ActivityColorMode)}><option value="intensity">Intensidad de origen</option><option value="rpe">Esfuerzo percibido · RPE</option></select></label><div className="activityColorScale"><i/><span>{colorMode==='intensity'?'≤50 %':'1/10'}</span><span>{colorMode==='intensity'?'75 %':'5–6/10'}</span><span>{colorMode==='intensity'?'≥100 %':'10/10'}</span></div><details><summary>Qué significa el color</summary><p>{colorMode==='intensity'?'Se utiliza la intensidad calculada que entrega Intervals.icu (icu_intensity). Verde a 50 % o menos, ocre a 75 % y rojo a 100 % o más; valores intermedios usan un gradiente. El cálculo de origen puede depender del deporte y de los datos disponibles.':'Se utiliza el esfuerzo percibido registrado en Intervals.icu (icu_rpe), de 1 a 10. Es una valoración subjetiva; no se sustituye por la intensidad calculada.'} La escala es visual: no define zonas, seguridad ni calidad del entrenamiento. Gris significa dato ausente. La duración y la FC media no determinan este color.</p><a href="https://forum.intervals.icu/t/api-access-to-intervals-icu/609" target="_blank" rel="noreferrer">Documentación de la fuente</a></details></div>
    {from&&to&&from>to&&<p role="alert">La fecha inicial debe ser anterior a la final.</p>}
    {loading&&<p role="status">Cargando sesiones y detalle de origen…</p>}{error&&<p role="alert">{error}</p>}{metadataError&&<p role="status">{metadataError} Las sesiones siguen disponibles; algunos nombres y colores pueden faltar.</p>}
    {!loading&&!error&&<>
      {!selected&&<ActivityOverview sessions={base} colorMode={colorMode} activeDay={activeDay} onDay={day=>{setActiveDay(day);setSelectedId('');setLimit(24);}} onSport={setSport}/>}
      <div className="activityResultsHead" ref={resultsRef}><div><h2>{selected?'Explorando una sesión':'Tus sesiones'}</h2><span>{filtered.length} sesiones · más recientes primero{activeDay?` · ${activeDay}`:''}</span></div>{selected&&<button onClick={()=>setSelectedId('')}>← Volver al panorama</button>}{activeDay&&<button onClick={()=>{setActiveDay('');setSelectedId('');}}>Quitar selección de día</button>}</div>
      {!filtered.length?<section className="card activityEmpty"><h3>Sin sesiones en esta selección</h3><p>Amplía las fechas, cambia el deporte o quita el día seleccionado.</p><button className="secondary" onClick={clear}>Mostrar todas las sesiones</button></section>:<div className={selected?'activityWorkspace activityHubDetail':'activityGallery'}>
        <section aria-label="Lista de entrenamientos"><div className="activityList">{filtered.slice(0,limit).map(s=><ActivitySessionCard key={s.id} session={s} colorMode={colorMode} selected={s.id===selected?.id} onSelect={()=>setSelectedId(s.id)}/>)}</div>{filtered.length>limit&&<button className="secondary" onClick={()=>setLimit(n=>n+24)}>Mostrar 24 más</button>}</section>
        {selected&&userId&&<ActivityDetail key={selected.id} session={selected} sessions={sessions} userId={userId} colorMode={colorMode} onOpenBody={onOpenBody}/>}
      </div>}
    </>}
    </>}
  </div>;
}


