import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { BodyHistorySnapshot } from '../../body/view-state';

interface Props {
  history: BodyHistorySnapshot | null;
  selectedDate: string;
  comparisonDate: string | null;
  onChange: (date: string) => void;
  onPinComparison: (date: string | null) => void;
  asOfDate: string;
  windowDays: number;
  onWindowChange: (days: number) => void;
}

function parseDate(date: string) { return new Date(`${date}T12:00:00Z`); }
function minusDays(date: string, days: number) { const d = parseDate(date); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10); }
function dateRange(start: string, end: string) { const dates: string[] = []; const cursor = parseDate(start); const last = parseDate(end); while (cursor <= last && dates.length < 550) { dates.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); } return dates; }
function shortDate(value: string) { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(parseDate(value)); }

export default function BodyTimeline({ history, selectedDate, comparisonDate, onChange, onPinComparison, asOfDate, windowDays, onWindowChange }: Props) {
  const visibleStart = minusDays(asOfDate, windowDays - 1);
  const dates = useMemo(() => dateRange(visibleStart, asOfDate), [asOfDate, visibleStart]);
  const dayMap = useMemo(() => new Map((history?.days ?? []).map((day) => [day.date, day])), [history]);
  const selectedIndex = Math.max(0, dates.indexOf(selectedDate));
  const compareIndex = comparisonDate ? dates.indexOf(comparisonDate) : -1;
  const latestDate = history?.latestObservedDate ?? null;
  const latestIndex = latestDate ? dates.indexOf(latestDate) : -1;

  return (
    <section className="bodyV4Timeline" aria-label="Historia fisiológica navegable">
      <div className="bodyV4TimelineHead">
        <div>
          <span>Historia fisiológica</span>
          <strong>{selectedDate === asOfDate ? 'Hoy' : shortDate(selectedDate)}</strong>
          {comparisonDate && <small>comparación fijada · {shortDate(comparisonDate)}</small>}
        </div>
        <div className="bodyV4TimelineControls">
          {[30, 90, 365].map((days) => <button key={days} className={windowDays === days ? 'active' : ''} onClick={() => onWindowChange(days)}>{days === 365 ? '1 año' : `${days} d`}</button>)}
          <span className="bodyV4TimelineDivider" />
          {selectedDate !== asOfDate && <button className="compare" onClick={() => onPinComparison(comparisonDate === selectedDate ? null : selectedDate)}>{comparisonDate === selectedDate ? 'Quitar comparación' : 'Fijar comparación'}</button>}
          {latestDate && latestDate !== asOfDate && <button onClick={() => onChange(latestDate)}>Último dato</button>}
          <button className={selectedDate === asOfDate ? 'active' : ''} onClick={() => onChange(asOfDate)}>Hoy</button>
        </div>
      </div>

      <div className="bodyV4TimelineStage">
        <div className="bodyV4CoverageTrack" aria-hidden="true">
          {dates.map((date) => {
            const day = dayMap.get(date);
            const measured = day?.evidenceKinds.includes('measured');
            return <i key={date} className={`${day ? 'data' : 'gap'} ${measured ? 'measured' : ''}`} style={{ '--coverage': `${Math.max(8, (day?.coverage ?? 0) * 100)}%` } as CSSProperties} />;
          })}
        </div>
        <div className="bodyV4EventTrack" aria-hidden="true">
          {dates.map((date) => <i key={date} className={dayMap.get(date)?.exerciseCount ? 'event' : ''} />)}
        </div>
        {latestIndex >= 0 && <span className="bodyV4LatestMarker" style={{ left: `${(latestIndex / Math.max(1, dates.length - 1)) * 100}%` }} />}
        {compareIndex >= 0 && <span className="bodyV4CompareMarker" style={{ left: `${(compareIndex / Math.max(1, dates.length - 1)) * 100}%` }} />}
        <input aria-label="Seleccionar fecha fisiológica" type="range" min={0} max={Math.max(0, dates.length - 1)} value={selectedIndex} onChange={(event) => onChange(dates[Number(event.target.value)] ?? asOfDate)} />
      </div>

      <div className="bodyV4TimelineLegend">
        <small>{shortDate(visibleStart)}</small>
        <span><i className="coverage"/>cobertura</span>
        <span><i className="event"/>entrenamiento</span>
        <span><i className="comparison"/>comparación</span>
        <span><i className="gap"/>hueco</span>
        <small>{shortDate(asOfDate)}</small>
      </div>
    </section>
  );
}
