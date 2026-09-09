import { useEffect, useMemo, useRef, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { useWeeklyLearning } from '../hooks/useWeeklyLearning';
import { buildWeeklyLearning, lastCompletedSunday, type WeeklyQuestion } from '../health/weekly-learning';
import { stableJSON } from '../health/weekly-memory';
import { localToday, minusDays } from '../health/metrics/daily-series';
import { followWeeklyQuestion, saveWeeklyReview } from '../repositories/weekly-learning';
import WeeklyLearningPanel from './WeeklyLearningPanel';
import EventSheet from './EventSheet';
import CheckIn from './CheckIn';

export default function WeeklyReview({ onOpenTrend }: { onOpenTrend?: (key: string) => void }) {
  const { scope } = useSubject(), userId = scope?.dataUserId;
  const latest = lastCompletedSunday(localToday());
  const [selection, setSelection] = useState<{ userId?: string; end: string } | null>(null);
  const end = selection && selection.userId === userId ? selection.end : latest;
  const history = useBodyHistory(end, 365), context = useWeeklyLearning(end);
  const [event, setEvent] = useState<{ userId: string; date: string } | null>(null);
  const [checkDate, setCheckDate] = useState(end);
  const [notice, setNotice] = useState({ key: '', text: '', error: false });
  const saved = useRef(new Set<string>());
  const key = `${userId}|${end}`;
  const report = useMemo(() => history.data && context.context ? buildWeeklyLearning({ points: history.data.points ?? [], ...context.context }, end, context.memory?.memories ?? []) : null,
    [history.data, context.context, context.memory, end]);
  const signature = report ? stableJSON({ userId, end, report }) : '';
  const canSave = Boolean(scope?.isSelf && report && history.data?.points?.length && context.memory && !context.memoryError);
  useEffect(() => {
    let active = true;
    if (canSave && report && userId && end === latest && !saved.current.has(signature)) {
      setNotice({ key, text: 'Guardando la revisión de esta semana…', error: false });
      saveWeeklyReview(userId, report).then(() => {
        saved.current.add(signature);
        if (active) { setNotice({ key, text: 'Revisión guardada. Las nuevas lecturas conservarán esta memoria.', error: false }); context.refresh(); }
      }).catch(error => { if (active) setNotice({ key, text: `La lectura está disponible, pero no se ha guardado: ${error.message}`, error: true }); });
    }
    return () => { active = false; };
    // The report signature controls persistence, not refresh callback identity.
  }, [canSave, signature, userId, end, latest]);
  const choose = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > latest || date < minusDays(latest, 364)) return;
    const sunday = minusDays(date, new Date(`${date}T12:00:00Z`).getUTCDay());
    setSelection({ userId, end: sunday }); setCheckDate(sunday);
  };
  const openTrend = (metric: string) => {
    sessionStorage.setItem('healthos.trends.subject', userId ?? ''); sessionStorage.setItem('healthos.trends.date', end);
    sessionStorage.setItem('healthos.trends.window', '30'); onOpenTrend?.(metric);
  };
  const follow = async (q: WeeklyQuestion, value: boolean) => {
    if (!scope?.isSelf || !userId) return;
    try { await followWeeklyQuestion(userId, q, value); setNotice({ key, text: value ? 'Pregunta en seguimiento.' : 'La pregunta deja de estar destacada. Su memoria se conserva.', error: false }); context.refresh(); }
    catch (error: any) { setNotice({ key, text: error.message, error: true }); }
  };
  const save = async () => {
    if (!canSave || !report || !userId) return;
    try { await saveWeeklyReview(userId, report); saved.current.add(signature); setNotice({ key, text: 'Revisión guardada con la fecha de hoy; conserva la semana que estás explorando.', error: false }); context.refresh(); }
    catch (error: any) { setNotice({ key, text: error.message, error: true }); }
  };
  return <>
    <div className="weeklyToolbar" aria-label="Semana de la revisión"><button disabled={end <= minusDays(latest, 357)} onClick={() => choose(minusDays(end, 7))}>← Semana anterior</button><label>Semana terminada el <input type="date" min={minusDays(latest, 357)} max={latest} value={end} onChange={e => choose(e.target.value)}/></label><button disabled={end >= latest} onClick={() => choose(minusDays(end, -7))}>Semana siguiente →</button>{end !== latest && <button onClick={() => choose(latest)}>Última semana completa</button>}</div>
    {(history.loading || context.loading) && <p role="status">Conectando noches, señales y contexto…</p>}
    {(history.error || context.error) && <p className="syncError" role="alert">{history.error || context.error} <button onClick={() => { history.refresh(); context.refresh(); }}>Reintentar</button></p>}
    {context.memoryError && <p className="weeklyFollowError" role="alert">No se pudo recuperar la memoria: {context.memoryError}. Las lecturas actuales se muestran sin guardar cambios. <button onClick={context.refresh}>Reintentar</button></p>}
    {notice.key === key && <p className={notice.error ? 'weeklyFollowError' : 'weeklySaveStatus'} role={notice.error ? 'alert' : 'status'}>{notice.text}{notice.error && canSave && <button onClick={save}>Reintentar guardado</button>}</p>}
    {report && !history.loading && !context.loading && <>
      <WeeklyLearningPanel report={report} memories={context.memory?.memories ?? []} following={context.memory?.following ?? []} onOpenTrend={onOpenTrend ? openTrend : undefined}
        onAddContext={scope?.isSelf && userId ? date => setEvent({ userId, date }) : undefined} onFollow={scope?.isSelf && !context.memoryError ? follow : undefined}/>
      {scope?.isSelf ? <><p className="weeklySaveStatus">La última semana completa se guarda al abrir esta vista. Puedes guardar también una semana histórica recalculada; la fecha de guardado queda visible.</p><button className="secondary" disabled={!canSave} onClick={save}>Guardar esta revisión</button><details className="card"><summary>Añadir cómo me sentía en uno de estos días</summary><label className="weeklyContextDate">Día <input type="date" min={report.start} max={end} value={checkDate >= report.start && checkDate <= end ? checkDate : end} onChange={e => setCheckDate(e.target.value)}/></label><CheckIn key={`${userId}|${checkDate}`} date={checkDate >= report.start && checkDate <= end ? checkDate : end} onSaved={context.refresh}/></details></> : <p className="weeklySaveStatus">Vista de lectura. Puedes consultar las revisiones guardadas; el contexto y el seguimiento los modifica la persona titular del perfil.</p>}
    </>}
    {event && event.userId === userId && scope?.isSelf && <EventSheet key={`${userId}|${event.date}`} initialDate={event.date} onClose={() => setEvent(null)} onSaved={context.refresh}/>}
  </>;
}
