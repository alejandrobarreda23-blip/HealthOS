import { useEffect, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { saveEvent } from '../repositories/events';
import { localToday, minusDays } from '../health/metrics/daily-series';
import { contextLabel } from './WeeklyLearningPanel';
export default function EventSheet({ onClose, initialDate = localToday(), onSaved }: { onClose: () => void; initialDate?: string; onSaved?: () => void }) {
  const { scope } = useSubject();
  const [type, setType] = useState('routine_change'), [date, setDate] = useState(initialDate), [note, setNote] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [busy, onClose]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!scope?.isSelf || busy) return;
    setBusy(true); setMessage('');
    try {
      const at = new Date(`${date}T12:00:00`);
      await saveEvent(scope.dataUserId, { eventType: type, startedAt: at.toISOString(), physiologicalDate: date, note,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, utcOffsetMinutes: -at.getTimezoneOffset(), dayPrecision: true });
      onSaved?.(); onClose();
    } catch (error: any) { setMessage(error.message ?? 'No se pudo guardar el contexto.'); } finally { setBusy(false); }
  }
  return <div className="overlay" onClick={() => { if (!busy) onClose(); }}><form className="sheet weeklyEventForm" role="dialog" aria-modal="true" aria-labelledby="context-title" onSubmit={save} onClick={e => e.stopPropagation()}><h3 id="context-title">Dar contexto a un día</h3><p>Opcional. Se registra el día que elijas, sin atribuir una hora exacta ni asumir que explica un cambio.</p><label>Día<input autoFocus required type="date" value={date} min={minusDays(localToday(), 365)} max={localToday()} onChange={e => setDate(e.target.value)}/></label><label>Qué ocurrió<select value={type} onChange={e => setType(e.target.value)}>{['routine_change', 'travel', 'illness', 'late_dinner', 'alcohol', 'medication', 'sauna'].map(t => <option key={t} value={t}>{contextLabel(t)}</option>)}</select></label><label>Nota opcional<textarea maxLength={2000} value={note} placeholder="Algo que ayude a recordar ese día…" onChange={e => setNote(e.target.value)}/></label>{message && <p role="alert">{message}</p>}<div className="sheetActions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy || !scope?.isSelf}>{busy ? 'Guardando…' : 'Guardar contexto'}</button></div></form></div>;
}
