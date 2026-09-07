import { useMemo } from 'react';
import type { BodyHistorySnapshot } from '../../body/view-state';

interface Props {
  history: BodyHistorySnapshot | null;
  selectedDate: string;
  onChange: (date: string) => void;
  asOfDate: string;
}

function parseDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

function dateRange(start: string, end: string) {
  const dates: string[] = [];
  const cursor = parseDate(start);
  const last = parseDate(end);
  while (cursor <= last && dates.length < 550) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(parseDate(value));
}

export default function BodyTimeline({ history, selectedDate, onChange, asOfDate }: Props) {
  const dates = useMemo(
    () => history ? dateRange(history.startDate, history.endDate) : [asOfDate],
    [asOfDate, history],
  );
  const dayMap = useMemo(() => new Map((history?.days ?? []).map((day) => [day.date, day])), [history]);
  const selectedIndex = Math.max(0, dates.indexOf(selectedDate));
  const latestDate = history?.latestObservedDate ?? null;
  const latestIndex = latestDate ? dates.indexOf(latestDate) : -1;

  return (
    <section className="bodyV3Timeline" aria-label="Historia fisiológica navegable">
      <div className="bodyV3TimelineHead">
        <div>
          <span>Historia fisiológica</span>
          <strong>{selectedDate === asOfDate ? 'Presente' : shortDate(selectedDate)}</strong>
        </div>
        <div className="bodyV3TimelineActions">
          {latestDate && latestDate !== asOfDate && (
            <button type="button" onClick={() => onChange(latestDate)}>Último dato · {shortDate(latestDate)}</button>
          )}
          <button type="button" className={selectedDate === asOfDate ? 'active' : ''} onClick={() => onChange(asOfDate)}>Hoy</button>
        </div>
      </div>

      <div className="bodyV3TimelineStage">
        <div className="bodyV3TimelineRaster" aria-hidden="true">
          {dates.map((date) => {
            const day = dayMap.get(date);
            const height = day ? Math.max(10, day.coverage * 100) : 0;
            const hasMeasured = day?.evidenceKinds.includes('measured');
            return (
              <i
                key={date}
                className={`${day ? 'has-data' : 'gap'} ${hasMeasured ? 'has-measured' : ''}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        {latestIndex >= 0 && <span className="bodyV3LatestMarker" style={{ left: `${(latestIndex / Math.max(1, dates.length - 1)) * 100}%` }} />}
        <input
          aria-label="Seleccionar fecha fisiológica"
          type="range"
          min={0}
          max={Math.max(0, dates.length - 1)}
          value={selectedIndex}
          onChange={(event) => onChange(dates[Number(event.target.value)] ?? asOfDate)}
        />
      </div>

      <div className="bodyV3TimelineFoot">
        <small>{history?.startDate ? shortDate(history.startDate) : ''}</small>
        <div className="bodyV3TimelineLegend">
          <span><i className="observed" />dato</span>
          <span><i className="measured" />medido</span>
          <span><i className="missing" />hueco</span>
        </div>
        <small>{shortDate(asOfDate)}</small>
      </div>
    </section>
  );
}
