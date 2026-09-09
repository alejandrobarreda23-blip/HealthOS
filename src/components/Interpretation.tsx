import type { Narrative } from '../health/interpretation';
import './interpretation.css';
const LEVELS: Record<Narrative['level'], string> = { description: 'Descripción de tus datos', first: 'Primera asociación', repeated: 'Asociación repetida · exploratoria', inconsistent: 'Relación no consistente', insufficient: 'Evidencia pendiente' };
export default function Interpretation({ narrative, showTitle = false, showLevel = true }: { narrative: Narrative; showTitle?: boolean; showLevel?: boolean }) {
  return <div className="interpretation">{showLevel && <span className="interpretationLevel">{LEVELS[narrative.level]}</span>}{showTitle && <h3>{narrative.title}</h3>}
    <p className="interpretationObservation">{narrative.observation}</p>
    <p className="interpretationConnection">{narrative.connection}</p>
    {narrative.personal && <p className="interpretationPersonal">{narrative.personal}</p>}
    <details className="interpretationSources"><summary>Qué significa y cómo interpretarlo</summary>
      <h4>Qué vemos · Cómo se relaciona · Qué significa para ti</h4>
      <p>{narrative.meaning}</p><p>{narrative.next}</p>
      {!!narrative.sources.length && <><p>Estas fuentes describen conocimiento general. No prueban la causa ni un beneficio individual en los datos de esta pantalla.</p>{narrative.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a>)}</>}
    </details>
  </div>;
}
