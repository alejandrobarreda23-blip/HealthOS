import Interpretation from './Interpretation';
import { jointNarrative, episodeHeadline, differenceText } from '../health/interpretation';
import { labelFor, type Episode, type EpisodeReading } from '../health/episodes';
import { formatClock } from '../health/weekly-learning';
import { formatMonitoring } from '../health/monitoring-metrics';
import './episodes.css';
export const episodeDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
export const episodeValue = (key: string, value: number) => key === 'bedtime' ? formatClock(value) : formatMonitoring(key, value);
export const episodeDelta = differenceText;
export const episodeTitle = episodeHeadline;
export function EpisodeMethod() { return <details className="episodeMethod"><summary>Cómo elegimos qué destacar</summary><p>Solo días completos y el tramo más reciente de una misma fuente, dispositivo y versión. Un cambio de fuente o de zona horaria en los horarios reinicia la referencia. Cada inicio se compara con los 28 días anteriores, con al menos 20 registrados. El rango descriptivo es la mediana ± el mayor de dos veces la desviación absoluta mediana escalada (1,4826), el doble del rango intercuartílico escalado (1/1,349) y un mínimo por señal.</p><p>Mínimos: sueño e inicio del sueño, 30 min; pulso, 3 bpm; HRV, 10 ms; pasos, 1000; eficiencia, 3 puntos; SpO₂, 1 punto; temperatura, 0,2 °C. Son filtros de presentación, no límites clínicos ni pruebas de significación.</p><p>Un episodio necesita tres días consecutivos fuera del rango en la misma dirección. Conserva su referencia inicial y requiere dos días consecutivos dentro para describir un regreso. Los huecos interrumpen la lectura. Agrupamos señales con al menos dos fechas de cambio compartidas e inicios separados como máximo siete días. El orden registrado no demuestra causalidad.</p><p>La lectura semanal requiere cinco días recientes y 20 anteriores; destaca un desplazamiento de la mediana solo si al menos cuatro días superan también el rango en esa dirección. Puede haber episodios breves sin un desplazamiento de toda la semana. La HRV de Ultrahuman y RMSSD se analizan por separado. Los horarios usan la zona registrada y distancias circulares alrededor de medianoche.</p></details>; }
export default function JointReading({ report, onOpen }: { report: EpisodeReading; onOpen?: (episode: Episode) => void }) {
  const narrative = jointNarrative(report);
  const current = report.episodes.filter(e => e.end >= report.start).slice(0, 2);
  const recent = current.length ? current : report.episodes.slice(0, 2);
  return <section className="card jointReading" aria-label="Lectura conjunta"><div className="eyebrow">TUS SEÑALES, JUNTAS</div><h2>{narrative.title}</h2><p>{episodeDate(report.start)} – {episodeDate(report.end)} · Últimos siete días completos.</p>
    <Interpretation narrative={narrative}/>
    <details className="todaySignals"><summary>Las cifras que sostienen esta lectura</summary>
    <div className="jointEvidence">{report.summary.map(s => <div key={s.key}><strong>{labelFor(s.key)}</strong><span>{episodeValue(s.key, s.value)}</span><small>{s.state === 'shift' ? `${episodeDelta(s.key, s.delta!)} · ${s.persistent} días fuera del rango` : s.state === 'within' ? `${s.delta === 0 ? 'Sin diferencia de mediana' : episodeDelta(s.key, s.delta!)} · dentro del rango anterior` : s.state === 'mixed' ? 'Diferencia sin persistencia suficiente' : 'Comparación aún incompleta'} · {s.count}/7 días</small></div>)}</div>
    </details>
    {!report.summary.length && <p>No hay registros de días completos esta semana. Explora otra fecha desde Evolución.</p>}
    {!!recent.length && <div className="jointEpisodes"><h3>{current.length ? 'Para entender estos días' : 'Episodios anteriores que puedes explorar'}</h3>{recent.map(e => <button key={e.id} disabled={!onOpen} onClick={() => onOpen?.(e)}><span>{episodeDate(e.start)} – {episodeDate(e.end)}</span><b>{episodeTitle(e)}</b><span>Abrir episodio →</span></button>)}</div>}
    <EpisodeMethod/>
  </section>;
}
