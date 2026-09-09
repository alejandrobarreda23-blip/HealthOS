import { useEffect, useState } from 'react';
import { distance, episodeContext, labelFor, referenceBefore, type Episode, type EpisodeReading, type SignalHistory } from '../health/episodes';
import { median, minusDays } from '../health/metrics/daily-series';
import type { WeeklyInput } from '../health/weekly-learning';
import { contextLabel } from './WeeklyLearningPanel';
import { EpisodeMethod, episodeDate, episodeDelta, episodeTitle, episodeValue } from './JointReading';
import './episodes.css';

function EpisodeChart({ report, episode, start, end, day, onDay }: { report: EpisodeReading; episode: Episode; start: string; end: string; day: string; onDay: (date: string) => void }) {
  const [width, setWidth] = useState(typeof window !== 'undefined' && window.innerWidth < 600 ? 360 : 700);
  useEffect(() => { const resize = () => setWidth(window.innerWidth < 600 ? 360 : 700); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const series = report.signals.filter(s => s.rows.some(r => r.date >= start && r.date <= end));
  const x = (date: string) => 12 + (Date.parse(date) - Date.parse(start)) / Math.max(86400000, Date.parse(end) - Date.parse(start)) * (width - 24);
  return <div className="episodeChart"><p>Mismas fechas · escalas independientes. La franja vertical marca el episodio; la horizontal, el rango previo de cada señal.</p>{series.map(signal => {
    const rows = signal.rows.filter(r => r.date >= start && r.date <= end);
    const member = episode.signals.find(s => s.key === signal.key);
    const reference = member?.reference ?? referenceBefore(signal, episode.start);
    const values = rows.map(r => ({ ...r, y: reference ? distance(r.value, reference.center, signal.circular) : signal.circular ? distance(r.value, rows[0].value, true) : r.value }));
    const threshold = reference?.threshold ?? 0;
    const low = Math.min(...values.map(r => r.y), reference ? -threshold : Infinity), high = Math.max(...values.map(r => r.y), reference ? threshold : -Infinity);
    const padding = Math.max((high - low) * .15, 1), y = (v: number) => 85 - (v - low + padding) / (high - low + padding * 2) * 72;
    const selected = rows.find(r => r.date === day);
    const paths: typeof values[] = [];
    for (const row of values) { if (!paths.length || row.date !== minusDays(paths.at(-1)!.at(-1)!.date, -1)) paths.push([]); paths.at(-1)!.push(row); }
    return <div className="episodeLane" key={signal.key}><div><strong>{labelFor(signal.key)}</strong><small>{selected ? `${episodeDate(day)} · ${episodeValue(signal.key, selected.value)}` : `${rows.length} días registrados · selecciona una fecha`}</small></div>
      <svg viewBox={`0 0 ${width} 108`} role="img" aria-label={`${labelFor(signal.key)}, ${episodeDate(start)} a ${episodeDate(end)}. Detalle diario disponible debajo.`}>
        <rect x={Math.max(12, x(episode.start))} width={Math.max(1, Math.min(width - 12, x(episode.end)) - Math.max(12, x(episode.start)))} y="3" height="90" fill="#e5c997" opacity=".25"/>
        {reference && <><rect x="12" width={width - 24} y={y(threshold)} height={y(-threshold) - y(threshold)} fill="#dbe7df"/><line x1="12" x2={width - 12} y1={y(0)} y2={y(0)} stroke="#789486" strokeDasharray="4 4"/></>}
        {paths.filter(p => p.length > 1).map(p => <polyline key={p[0].date} points={p.map(r => `${x(r.date)},${y(r.y)}`).join(' ')} fill="none" stroke={member ? '#325f4c' : '#81939a'} strokeWidth="1.5"/>)}
        {values.map(r => <circle key={r.date} cx={x(r.date)} cy={y(r.y)} r={r.date === day ? 5 : 3} fill={member ? '#325f4c' : '#81939a'} onClick={() => onDay(r.date)}><title>{`${r.date}: ${episodeValue(signal.key, r.value)}`}</title></circle>)}
        {day >= start && day <= end && <line x1={x(day)} x2={x(day)} y1="3" y2="93" stroke="#9d7537" strokeDasharray="3 3"/>}
        <text x="12" y="106" fontSize="10">{episodeDate(start)}</text><text x={width - 12} y="106" textAnchor="end" fontSize="10">{episodeDate(end)}</text>
      </svg>{!reference && <small>Sin referencia previa suficiente: se muestran únicamente los registros.</small>}
    </div>;
  })}</div>;
}
function Comparison({ episode, signals }: { episode: Episode; signals: SignalHistory[] }) {
  return <div className="episodeComparison"><h4>{episodeDate(episode.start)} – {episodeDate(episode.end)}</h4>{episode.signals.map(s => {
    const rows = signals.find(r => r.key === s.key && r.source === s.source)?.rows ?? [];
    const during = rows.filter(r => r.date >= s.start && r.date <= s.end);
    const after = rows.filter(r => r.date > s.end && r.date <= minusDays(s.end, -7));
    const delta = (data: typeof rows) => median(data.map(r => distance(r.value, s.reference.center, s.key === 'bedtime')));
    return <div key={s.id}><b>{labelFor(s.key)}</b><p>Antes: {episodeValue(s.key, s.reference.center)} · {s.reference.count}/28 días.</p><p>Durante: {episodeDelta(s.key, delta(during)!)} respecto a esa referencia · {during.length} días.</p><p>Después: {after.length >= 5 ? `${episodeDelta(s.key, delta(after)!)} · ${after.length}/7 días` : `${after.length}/7 días; todavía no resumimos la semana posterior`}.</p></div>;
  })}<small>Periodos observacionales. Diferencias entre episodios no identifican el efecto de una conducta.</small></div>;
}
export default function EpisodeExplorer({ report, input, initialId, onExplore, onContext }: { report: EpisodeReading; input: WeeklyInput; initialId?: string; onExplore?: (episode: Episode) => void; onContext?: (date: string) => void }) {
  const [selected, setSelected] = useState(initialId ?? ''), [filter, setFilter] = useState('all'), [limit, setLimit] = useState(12);
  const [compareId, setCompareId] = useState(''), [range, setRange] = useState<{ id: string; start: string; end: string } | null>(null), [pickedDay, setPickedDay] = useState('');
  const list = report.episodes.filter(e => filter === 'all' || e.signals.some(s => s.key === filter));
  const episode = list.find(e => e.id === selected) ?? list[0];
  const choose = (e: Episode) => { setSelected(e.id); setCompareId(''); setRange(null); setPickedDay(e.start); };
  const start = range && episode && range.id === episode.id ? range.start : episode ? minusDays(episode.start, 7) : report.start;
  const end = range && episode && range.id === episode.id ? range.end : episode ? [minusDays(episode.end, -7), report.end].sort()[0] : report.end;
  const day = pickedDay >= start && pickedDay <= end ? pickedDay : episode && episode.start >= start && episode.start <= end ? episode.start : start;
  const context = episode ? episodeContext(input, episode) : { events: [], checkIns: [] };
  const peers = episode ? report.episodes.filter(e => e.id !== episode.id && e.signals.some(s => episode.signals.some(a => a.key === s.key && a.source === s.source))) : [];
  const comparison = peers.find(e => e.id === compareId);
  const changeRange = (a: string, b: string) => { if (episode && a && b && a <= b && b <= report.end && a >= minusDays(report.asOf, 365)) setRange({ id: episode.id, start: a, end: b }); };
  return <section className="episodeExplorer" aria-label="Explorador de episodios"><div className="episodeHeading"><div className="eyebrow">CONECTAR LO QUE OCURRIÓ</div><h2>Episodios de tu historia</h2><p>Abre un periodo para mirar las señales juntas, seguir su orden y consultar el contexto registrado.</p></div>
    <label>Filtrar episodios por señal <select value={filter} onChange={e => { setFilter(e.target.value); setCompareId(''); }}><option value="all">Todas las señales</option>{report.signals.filter(s => report.episodes.some(e => e.signals.some(m => m.key === s.key))).map(s => <option key={s.key} value={s.key}>{labelFor(s.key)}</option>)}</select></label>
    {!list.length ? <div className="card"><h3>No hay episodios que cumplan todavía el criterio</h3><p>No equivale a que no haya cambios. Buscamos tres días consecutivos fuera de una referencia previa suficiente; puedes explorar las señales por fecha debajo.</p></div> : <>
      <div role="navigation" className="episodeList" aria-label="Elegir episodio">{list.slice(0, limit).map(e => <button key={e.id} aria-pressed={e.id === episode?.id} onClick={() => choose(e)}><small>{episodeDate(e.start)} – {episodeDate(e.end)}</small><b>{episodeTitle(e)}</b><span>{e.signals.map(s => labelFor(s.key)).join(' · ')}</span></button>)}</div>{list.length > limit && <button onClick={() => setLimit(n => n + 12)}>Ver episodios anteriores ({list.length - limit})</button>}
      {episode && <article className="card episodeDetail"><div className="eyebrow">{episodeDate(episode.start)} – {episodeDate(episode.end)}</div><h3>{episodeTitle(episode)}</h3>
        <ol className="episodeSequence">{episode.signals.map(s => <li key={s.id}><time>{episodeDate(s.start)}</time><div><b>{labelFor(s.key)} · {episodeDelta(s.key, s.delta)}</b><p>{s.dates.length} días fuera de su rango previo. {s.status === 'returned' ? `Dos días dentro del rango al ${episodeDate(s.returnedAt!)}.` : s.status === 'ongoing' ? 'La observación continúa; aún no hay dos días de regreso.' : 'Un hueco o un cambio de dirección interrumpe el seguimiento; no confirmamos un regreso.'}</p></div></li>)}</ol>
        <p className="muted">Este es el orden de los cambios registrados por fecha fisiológica. No establece qué los causó ni el orden dentro de un mismo día.</p>
        <div className="episodeWindow"><label>Desde <input aria-label="Inicio del gráfico conjunto" type="date" min={minusDays(report.asOf, 365)} max={end} value={start} onChange={e => changeRange(e.target.value, end)}/></label><label>Hasta <input aria-label="Fin del gráfico conjunto" type="date" min={start} max={report.end} value={end} onChange={e => changeRange(start, e.target.value)}/></label><button onClick={() => setRange({ id: episode.id, start: episode.start, end: episode.end })}>Solo el episodio</button><button onClick={() => setRange(null)}>Ver antes y después</button></div>
        <EpisodeChart report={report} episode={episode} start={start} end={end} day={day} onDay={setPickedDay}/>
        <div className="episodeDay"><label>Explorar un día <input type="date" min={start} max={end} value={day} onChange={e => setPickedDay(e.target.value)}/></label><div>{report.signals.map(s => { const row = s.rows.find(r => r.date === day); return <p key={s.key}><b>{labelFor(s.key)}:</b> {row ? episodeValue(s.key, row.value) : 'Sin registro en esta fecha'}</p>; })}</div>{onContext && <button onClick={() => onContext(day)}>Añadir contexto del {episodeDate(day)}</button>}</div>
        <h4>Qué acompañó a estas fechas</h4><p>Contexto registrado desde tres días antes hasta tres días después del episodio.</p>{!context.events.length && !context.checkIns.length && <p>No hay contexto registrado en estas fechas. Eso no significa que no ocurriera nada.</p>}
        {context.events.map(e => <p key={e.id}><b>{episodeDate(e.date)} · {contextLabel(e.type)}</b>{e.note && ` — ${e.note}`}</p>)}{context.checkIns.map(c => <p key={c.id}>{episodeDate(c.date)} · Energía {c.energy ?? 'sin dato'} · Estrés {c.stress ?? 'sin dato'} · Fatiga {c.fatigue ?? 'sin dato'} (escala 1–5).</p>)}
        <h4>Antes, durante y después</h4><label>Comparar con otro episodio <select value={comparison?.id ?? ''} onChange={e => setCompareId(e.target.value)}><option value="">Solo este episodio</option>{peers.map(e => <option key={e.id} value={e.id}>{episodeDate(e.start)} – {episodeDate(e.end)} · {e.signals.map(s => labelFor(s.key)).join(', ')}</option>)}</select></label>{!peers.length && <p>Aún no hay otro episodio con una señal de la misma fuente para comparar.</p>}
        <div className={`episodeCompareGrid ${comparison ? 'hasComparison' : ''}`}><Comparison episode={episode} signals={report.signals}/>{comparison && <Comparison episode={comparison} signals={report.signals}/>}</div>
        {onExplore && <button onClick={() => onExplore(episode)}>Abrir este intervalo en el gráfico de evolución ↓</button>}
        <details><summary>Ver referencia y fechas que sostienen este episodio</summary>{episode.signals.map(s => <div key={s.id}><h4>{labelFor(s.key)}</h4><p>Referencia: {s.reference.start} – {s.reference.end} · {s.reference.count}/28 días · mediana {episodeValue(s.key, s.reference.center)}.</p><p>Filtro de distancia: {episodeDelta(s.key, s.reference.threshold).replace(/ más$/, '')}. Días fuera: {s.dates.join(', ')}.</p></div>)}</details>
      </article>}
    </>}<EpisodeMethod/>
  </section>;
}
