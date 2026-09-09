import type { Episode, EpisodeReading, SignalEpisode } from './episodes';
import type { WeeklyQuestion } from './weekly-learning';
import { formatMonitoring } from './monitoring-metrics';

export const INTERPRETATION_VERSION = 'interpretation_v1';
const SOURCES = {
  heart: { title: 'American Heart Association · Qué influye en el pulso', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse' },
  sleep: { title: 'NHLBI · Sueño y salud', url: 'https://www.nhlbi.nih.gov/health/heart-healthy-living/sleep' },
  activity: { title: 'OMS · Actividad física y salud', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' },
  oxygen: { title: 'FDA · Cómo interpretar la oximetría', url: 'https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters' },
};
export interface Narrative { title: string; observation: string; connection: string; meaning: string; next: string; level: 'description' | 'first' | 'repeated' | 'inconsistent' | 'insufficient'; sources: { title: string; url: string }[]; }
const number = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
export const shortDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
export function differenceText(key: string, value: number) {
  if (Math.abs(value) < .00001) return 'sin diferencia';
  const amount = ['sleep_duration', 'bedtime'].includes(key) ? `${number(Math.abs(value))} min` : ['oxygen_saturation', 'sleep_efficiency'].includes(key) ? `${number(Math.abs(value))} puntos porcentuales` : formatMonitoring(key, Math.abs(value));
  return `${amount} ${value < 0 ? key === 'bedtime' ? 'antes' : 'menos' : key === 'bedtime' ? 'más tarde' : 'más'}`;
}
export function signalPhrase(key: string, direction: number) {
  const positive = direction > 0;
  const phrases: Record<string, [string, string]> = {
    sleep_duration: ['El sueño se alargó', 'El sueño se acortó'], bedtime: ['El sueño empezó más tarde', 'El sueño empezó antes'],
    resting_heart_rate: ['El pulso en reposo subió', 'El pulso en reposo bajó'], ultrahuman_sleep_hrv: ['La HRV nocturna subió', 'La HRV nocturna bajó'], hrv_rmssd: ['La HRV RMSSD subió', 'La HRV RMSSD bajó'],
    steps: ['Hubo más pasos', 'Hubo menos pasos'], sleep_efficiency: ['La eficiencia del sueño subió', 'La eficiencia del sueño bajó'], oxygen_saturation: ['La SpO₂ subió', 'La SpO₂ bajó'], temperature_deviation: ['La desviación de temperatura subió', 'La desviación de temperatura bajó'],
  };
  return phrases[key]?.[positive ? 0 : 1] ?? 'Cambió una señal';
}
export function metricMeaning(key: string) {
  if (key === 'resting_heart_rate') return { meaning: 'En personas entrenadas, un pulso menor puede acompañar una buena condición física. El pulso cambia con la actividad, las emociones, la temperatura y algunos medicamentos. Un valor más bajo no demuestra por sí solo que hayas descansado mejor.', next: 'Para valorar el descanso, mira si el cambio coincide también con un sueño adecuado y con más energía o menos fatiga al día siguiente.', sources: [SOURCES.heart, SOURCES.sleep] };
  if (key.includes('hrv')) return { meaning: 'Esta lectura permite comparar tu HRV con sus propios registros. Convertir una subida en «más salud» o una bajada en «peor recuperación» requiere evidencia adicional que esta comparación no aporta.', next: 'Comprueba el sueño, el pulso y cómo te sentías en las mismas fechas. Una señal aislada no decide si la rutina te beneficia.', sources: [] };
  if (key === 'steps') return { meaning: 'La actividad física regular tiene beneficios conocidos para la salud. Los pasos describen parte del movimiento diario, pero este cambio no mide por sí solo un beneficio personal ni su intensidad.', next: 'Mira si los días con más movimiento coinciden con sueño suficiente y cómo te sientes después. Esa combinación ayuda a formular una pregunta personal.', sources: [SOURCES.activity] };
  if (key === 'oxygen_saturation') return { meaning: 'La SpO₂ de un dispositivo es una estimación con limitaciones. Estar dentro de tu rango anterior no confirma una oxigenación adecuada ni convierte una lectura en normal.', next: 'Interpreta la medición junto con su calidad, el dispositivo y cómo te encuentras; no deduzcas beneficios de una subida aislada.', sources: [SOURCES.oxygen] };
  if (key === 'temperature_deviation') return { meaning: 'La desviación respecto a una referencia del dispositivo no es una temperatura corporal absoluta. Este valor no permite clasificar un día como saludable o perjudicial.', next: 'Comprueba si el cambio persiste, si hubo cambios de medición y qué contexto quedó registrado.', sources: [] };
  return { meaning: 'Dormir lo suficiente y con buena calidad contribuye a la salud. Acostarse antes, dormir más minutos o registrar mayor eficiencia no demuestra por separado que ese beneficio haya ocurrido en tu caso.', next: 'Comprueba si duración y horarios acompañan a una mejor sensación de descanso. Sin ese contexto seguimos describiendo el sueño, no calificando tu salud.', sources: [SOURCES.sleep] };
}
export function episodeHeadline(episode: Episode) {
  const ordered = [...episode.signals].sort((a, b) => a.start.localeCompare(b.start) || a.key.localeCompare(b.key));
  if (!ordered.length) return 'Un periodo para explorar';
  const a = ordered[0], b = ordered[1];
  return b ? `${signalPhrase(a.key, a.direction)}${a.start === b.start ? ' y ' : '; después '}${signalPhrase(b.key, b.direction).toLowerCase()}${ordered.length > 2 ? `, junto a ${ordered.length - 2} señales más` : ''}` : signalPhrase(a.key, a.direction);
}
export function episodeNarrative(episode: Episode): Narrative {
  const ordered = [...episode.signals].sort((a, b) => a.start.localeCompare(b.start) || a.key.localeCompare(b.key));
  if (!ordered.length) return { title: 'No hay episodio evaluable', observation: 'Faltan registros.', connection: 'No establecemos una relación.', meaning: 'No hay evidencia para valorar un beneficio.', next: 'Explora los registros disponibles.', level: 'insufficient', sources: [] };
  const [a, b] = ordered, guidance = metricMeaning(a.key);
  const overlap = b ? a.dates.filter(d => b.dates.includes(d)).length : 0;
  const sleep = ordered.find(s => s.key === 'sleep_duration'), hrv = ordered.find(s => s.key.includes('hrv'));
  return { title: episodeHeadline(episode), level: 'description',
    observation: ordered.slice(0, 2).map(s => `${signalPhrase(s.key, s.direction)} desde el ${shortDate(s.start)}: ${differenceText(s.key, s.delta)} en la mediana de los ${s.dates.length} días destacados, frente a su referencia previa.`).join(' ') + (ordered.length > 2 ? ` Hay ${ordered.length - 2} cambios adicionales detallados debajo.` : ''),
    connection: b ? `Los dos primeros cambios comparten ${overlap} días destacados. ${a.start === b.start ? 'El inicio registrado coincide en la misma fecha.' : `El primero empezó antes: ${shortDate(a.start)} frente a ${shortDate(b.start)}.`} Es una coincidencia dentro de este episodio; todavía no un patrón que se repite al realizar una conducta.` : 'Solo esta señal cumple el criterio de episodio. Las demás curvas aportan contexto, sin atribuirles el origen del cambio.',
    meaning: hrv && sleep && hrv.direction > 0 && sleep.direction < 0 ? 'Aquí subió la HRV y hubo noches más cortas. La subida de HRV no demuestra un mejor descanso ni compensa automáticamente la menor duración del sueño.' : guidance.meaning,
    next: sleep ? 'Para valorar si esta etapa te favoreció o te perjudicó, falta conectar estas noches con energía, fatiga y el contexto de esos días. Puedes registrarlo abajo si lo recuerdas.' : guidance.next,
    sources: sleep ? [SOURCES.sleep] : guidance.sources };
}
export function endingText(signal: SignalEpisode) {
  if (signal.status === 'returned') return `La señal volvió a su rango previo durante dos días consecutivos, confirmado el ${shortDate(signal.returnedAt!)}.`;
  if (signal.stopReason === 'opposite_shift') return `El ${shortDate(signal.stoppedAt!)} apareció un cambio en sentido contrario. Cerramos este tramo; no contamos ese cambio como un regreso al rango.`;
  if (signal.stopReason === 'missing_day') return `Falta un registro del ${shortDate(signal.stoppedAt!)}. La continuidad se interrumpe ahí y no podemos confirmar cuándo terminó el cambio.`;
  return `La historia disponible llega al ${shortDate(signal.stoppedAt ?? signal.end)}. Aún no hay dos días consecutivos que confirmen el regreso al rango previo.`;
}
export function jointNarrative(report: EpisodeReading): Narrative {
  const comparable = report.summary.filter(s => s.state !== 'insufficient' && s.delta !== null && s.reference);
  if (!comparable.length) return { title: 'Aún necesitamos más días para entender los cambios', observation: 'Puedes consultar las señales disponibles, pero todavía no hay una comparación semanal suficiente.', connection: 'No interpretamos la falta de datos como estabilidad.', meaning: 'No hay base suficiente para valorar un beneficio o perjuicio.', next: 'La comparación aparecerá cuando haya cinco días recientes y 20 anteriores de la misma señal y fuente.', level: 'insufficient', sources: [] };
  const ranked = [...comparable].sort((a, b) => Number(b.state === 'shift') - Number(a.state === 'shift') || Math.abs(b.delta!) / b.reference!.threshold - Math.abs(a.delta!) / a.reference!.threshold);
  const lead = ranked.find(s => s.state === 'shift') ?? comparable.find(s => s.key === 'steps' && Math.abs(s.delta!) >= 1000) ?? ranked[0], support = comparable.filter(s => ['sleep_duration', 'resting_heart_rate'].includes(s.key) && s.key !== lead.key);
  const meaningful = Math.abs(lead.delta!) >= lead.reference!.threshold * .35;
  const title = meaningful ? `${signalPhrase(lead.key, lead.delta!)} esta semana${support.length === 2 && support.every(s => s.state === 'within' && Math.abs(s.delta!) < s.reference!.threshold * .35) ? '; sueño y pulso cambiaron poco' : ''}` : 'Esta semana, las diferencias son pequeñas respecto a tu variación anterior';
  return { title, level: 'description', observation: [lead, ...support].map(s => `${signalPhrase(s.key, s.delta || 1).replace(/ (subió|bajó|se alargó|se acortó)$/, '')}: ${differenceText(s.key, s.delta!)} en la mediana, con ${s.count}/7 días registrados.`).join(' '),
    connection: report.changed.length ? 'Los cambios destacados persisten en varios días. Para hablar de «cuando haces esto, ocurre aquello» necesitamos comparar días concretos, no solo los promedios de una semana.' : 'Estas diferencias permanecen dentro de la variación previa o no tienen persistencia suficiente. Las medianas semanales no indican si los cambios ocurrieron juntos en los mismos días.',
    meaning: metricMeaning(lead.key).meaning, next: metricMeaning(lead.key).next, sources: metricMeaning(lead.key).sources };
}
export function questionNarrative(q: WeeklyQuestion): Narrative {
  const last = q.blocks.filter(b => b.delta !== null).at(-1), guidance = metricMeaning(q.y);
  const conditions: Record<string, string> = { 'sleep-pulse': 'En las noches por encima de tu referencia de duración', 'steps-next-sleep': 'Después de días por encima de tu referencia de pasos', 'short-nights-hrv': 'Después de dos noches consecutivas por encima de tu referencia de duración' };
  const outcome = q.y === 'sleep_duration' ? 'el sueño del día siguiente' : q.y === 'resting_heart_rate' ? 'el pulso atribuido a la misma fecha' : 'la HRV atribuida al día siguiente';
  const comparator = q.id === 'steps-next-sleep' ? 'después de los días que no superaron esa cantidad de pasos' : q.id === 'short-nights-hrv' ? 'después de dos noches que no superaron esa duración' : 'en las noches que no superaron esa duración';
  const observation = last ? `${conditions[q.id] ?? 'En el grupo comparado'}, ${outcome} ${last.delta === 0 ? 'no mostró diferencia de mediana' : `registró ${differenceText(q.y, last.delta!)}`} respecto a lo registrado ${comparator}. Comparamos ${last.matches.length} pares entre el ${shortDate(last.start)} y el ${shortDate(last.end)}.` : 'Todavía no hay suficientes pares de días comparables para responder a esta pregunta.';
  const status = q.state === 'repeated' ? 'La asociación vuelve a aparecer en dos periodos separados' : q.state === 'inconsistent' ? 'La relación cambia entre periodos; aún no es un patrón estable' : q.state === 'first_signal' ? 'Vemos una primera asociación, pendiente de repetición' : q.state === 'no_difference' ? 'No aparece una diferencia sostenida entre estos grupos' : 'La pregunta sigue abierta: faltan días comparables';
  return { title: status, observation, level: q.state === 'repeated' ? 'repeated' : q.state === 'first_signal' ? 'first' : q.state === 'inconsistent' ? 'inconsistent' : q.state === 'no_difference' ? 'description' : 'insufficient',
    connection: q.state === 'repeated' ? 'La dirección y el tamaño se parecen en dos periodos distintos. Es una asociación exploratoria: el horario, la rutina u otros factores no registrados podrían contribuir.' : q.state === 'inconsistent' ? 'Una diferencia de un periodo no resume toda tu historia. No usamos la última comparación para afirmar que esa conducta produce el resultado.' : q.state === 'first_signal' ? 'Falta comprobar la misma relación con fechas nuevas. Por ahora la presentamos como una pista, no como una causa.' : 'Esta lectura no permite atribuir un efecto a la conducta comparada.',
    meaning: guidance.meaning, next: q.y === 'resting_heart_rate' ? 'Para saber si las noches distintas se acompañan de mejor descanso, necesitamos contrastar también duración, horarios y sensaciones, además del pulso.' : guidance.next, sources: guidance.sources };
}
