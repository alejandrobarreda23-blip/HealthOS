import type { Narrative } from '../health/interpretation';
import './interpretation.css';
const LEVELS: Record<Narrative['level'], string> = { description: 'Descripción de tus datos', first: 'Primera asociación', repeated: 'Asociación repetida · exploratoria', inconsistent: 'Relación no consistente', insufficient: 'Evidencia pendiente' };
export default function Interpretation({ narrative, showTitle = false }: { narrative: Narrative; showTitle?: boolean }) {
  return <div className="interpretation"><span className="interpretationLevel">{LEVELS[narrative.level]}</span>{showTitle && <h3>{narrative.title}</h3>}
    <div className="interpretationSteps"><section><h4><span>A</span> Qué vemos</h4><p>{narrative.observation}</p></section><section><h4><span>B</span> Cómo se relaciona</h4><p>{narrative.connection}</p></section><section><h4><span>C</span> Qué significa para ti</h4><p>{narrative.meaning}</p></section></div>
    <p className="interpretationNext"><b>Para valorar beneficios o perjuicios:</b> {narrative.next}</p>
    {!!narrative.sources.length && <details className="interpretationSources"><summary>Qué respalda la explicación de salud</summary><p>Estas fuentes describen conocimiento general. No prueban la causa ni un beneficio individual en los datos de esta pantalla.</p>{narrative.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a>)}</details>}
  </div>;
}
