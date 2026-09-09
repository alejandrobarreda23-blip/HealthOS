import MonitoringInsights from '../components/MonitoringInsights';
import { useEffect, useMemo, useState } from 'react';
import { Activity, CircleGauge, Dumbbell, HeartPulse, Moon, Waves } from 'lucide-react';
import BodyDossier from '../components/body/BodyDossier';
import BodyFigureV4, { type BodyVisualMode } from '../components/body/BodyFigureV4';
import BodySystemLabel from '../components/body/BodySystemLabel';
import BodyTimeline from '../components/body/BodyTimeline';
import { type BodySystemKey } from '../body/view-state';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { useHealthBriefV1 } from '../hooks/useHealthBrief';
import { useSubject } from '../subjects/SubjectProvider';
import { bodySystemConfig } from '../body/system-config';
import { clampBodyDate, selectBody } from '../body/selectors';
import { localToday, minusDays } from '../health/metrics/daily-series';
import { evaluateMetric } from '../health/metrics/evaluation';
const SYSTEM_ICONS = { autonomic: Waves, cardio: HeartPulse, sleep: Moon, musculo: Dumbbell, metabolic: CircleGauge, recovery: Activity };
interface Props { onOpenTrend?: (metricKey: string) => void; onOpenActivities?: (date: string) => void; initialDate?: string; }
export default function Body({ onOpenTrend, onOpenActivities, initialDate }: Props) {
  const { scope } = useSubject();
  const brief = useHealthBriefV1();
  const asOfDate = localToday();
  const history = useBodyHistory(asOfDate, 365);
  const [selectedSystem, setSelectedSystem] = useState<BodySystemKey>('cardio');
  const [selectedDate, setSelectedDate] = useState(asOfDate);
  const [comparisonDate, setComparisonDate] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(365);
  const [mode, setMode] = useState<BodyVisualMode>('state');
  useEffect(() => { setSelectedDate(initialDate || asOfDate); setComparisonDate(null); }, [asOfDate, scope?.dataUserId, initialDate]);
  const latestEvaluable = useMemo(() => {
    const dates = [...new Set((history.data?.points ?? []).map(p => p.physiologicalDate))].filter(date => date >= minusDays(asOfDate,364)).sort().reverse();
    return dates.find(date => ['hrv_rmssd','resting_heart_rate','sleep_duration','oxygen_saturation'].some(key => {
      const status = evaluateMetric(history.data?.points ?? [],key,date).status;
      return status === 'detected' || status === 'not_detected';
    })) ?? null;
  }, [history.data, asOfDate]);
  const model = useMemo(() => selectBody(history.data, selectedDate), [history.data, selectedDate]);
  const { systems, selectedDay } = model;
  const selected = systems.find(s => s.key === selectedSystem)!;
  const isPresent = selectedDate === asOfDate;
  const globalCoverage = selectedDay?.coverage ?? 0;
  const observedSystems = systems.filter(s => s.hasExactDaySignal).length;
  const latestObserved = history.data?.latestObservedDate ?? null;
  const historicalGap = !selectedDay;
  const stateLabel = history.loading ? 'Cargando historia' : isPresent ? 'Hoy' : `Historia · ${selectedDate}`;
  const openTrend = (metricKey: string) => {
    sessionStorage.setItem('healthos.trends.date', selectedDate);
    sessionStorage.setItem('healthos.trends.window', String(windowDays));
    sessionStorage.setItem('healthos.trends.subject', scope?.dataUserId ?? '');
    onOpenTrend?.(metricKey);
  };
  const selectedConfig = bodySystemConfig(selectedSystem);
  const changeWindow = (days: number) => {
    setWindowDays(days);
    setSelectedDate(d => clampBodyDate(d, asOfDate, days));
    setComparisonDate(d => d && clampBodyDate(d, asOfDate, days) === d ? d : null);
  };
  return (
    <div className="bodyV4Screen">
      <header className="bodyV4Header">
        <div>
          <div className="eyebrow">HEALTH OS · ORGANISM EXPLORER</div>
          <h1>Cuerpo</h1>
          <p>Navega sistemas, tiempo y evidencia. El organismo es el índice; cada canal debe poder explicar qué sabe HealthOS y qué no sabe.</p>
        </div>
        <div className="bodyV4HeaderTools">
          <div className="bodyV4ModeSwitch" aria-label="Modo visual del organismo">
            <button className={mode === 'state' ? 'active' : ''} onClick={() => setMode('state')}>Estado</button>
            <button className={mode === 'coverage' ? 'active' : ''} onClick={() => setMode('coverage')}>Cobertura</button>
            <button className={mode === 'provenance' ? 'active' : ''} onClick={() => setMode('provenance')}>Procedencia</button>
          </div>
          <div className={`bodyStatePill ${historicalGap ? 'gap' : ''}`}><span />{stateLabel}</div>
        </div>
      </header>

      {history.error && <div className="bodyV3LoadNotice" role="alert">{history.error}</div>}
      {history.loading && <p role="status">Cargando observaciones y referencias…</p>}
      <p className="bodyAnalysisNote">Lectura descriptiva recalculada hasta {selectedDate}. Último análisis guardado: {brief.data?.date ?? 'sin análisis disponible'}. Los canales disponibles no representan un porcentaje de salud del sistema.</p>
      <div className="activityFreshness">
        <span>Hoy: {asOfDate} · último registro: {latestObserved ?? 'sin datos'}. {latestObserved && latestObserved < asOfDate ? 'Los datos anteriores no describen el estado de hoy.' : ''}</span>
        {latestObserved && <button onClick={() => { setWindowDays(365); setSelectedDate(clampBodyDate(latestObserved,asOfDate,365)); }}>Ir al último dato</button>}
        {latestEvaluable ? <button onClick={() => { setWindowDays(365); setSelectedDate(clampBodyDate(latestEvaluable,asOfDate,365)); }}>Última ventana evaluable · {latestEvaluable}</button> : <span>Aún no hay una ventana evaluable para las señales diarias.</span>}
        {onOpenActivities && Boolean(selectedDay?.exerciseCount) && <button onClick={() => onOpenActivities(selectedDate)}>Ver entrenamientos del {selectedDate}{selectedDay ? ` (${selectedDay.exerciseCount})` : ''}</button>}
      </div>

      {!history.loading && !history.error && <MonitoringInsights mode="compact" points={history.data?.points ?? []} asOf={selectedDate} onOpenTrend={openTrend}/>}
      <details open><summary>Explorar el mapa corporal y sus señales</summary>
      <div className="bodyV4TopMetrics">
        <div><span>Fecha explorada</span><strong>{selectedDate}</strong></div>
        <div><span>Sistemas con señal</span><strong>{observedSystems}<small>/6</small></strong></div>
        <div><span>Canales diarios disponibles</span><strong>{Math.round(globalCoverage * 100)}<small>%</small></strong></div>
        <div><span>Último dato</span><strong>{latestObserved ?? '—'}</strong></div>
        {comparisonDate && <div className="comparison"><span>Comparando con</span><strong>{comparisonDate}</strong><button onClick={() => setComparisonDate(null)}>×</button></div>}
      </div>

      <div className="bodyCompactSystems" aria-label="Elegir sistema">
        {systems.map(system => <button key={system.key} aria-pressed={system.key === selectedSystem} onClick={() => setSelectedSystem(system.key)}>{system.title}</button>)}
      </div>
      <div className="bodyV4Workspace">
        <section className="bodyV4OrganismStage">
          <div className="bodyV4StageInner">
            <div className="bodyV4LabelRail left">
              {systems.slice(0, 3).map((system) => <BodySystemLabel key={system.key} state={system} icon={SYSTEM_ICONS[system.key]} selected={selectedSystem === system.key} side="left" onSelect={() => setSelectedSystem(system.key)} />)}
            </div>

            <div className="bodyV4OrganismCenter">
              <div className="bodyV4FocusHeader">
                <span>{selectedConfig.shortLabel}</span>
                <strong>{selected.headline}</strong>
              </div>
              <BodyFigureV4 systems={systems} selectedSystem={selectedSystem} onSelectSystem={setSelectedSystem} isPresent={isPresent} mode={mode} />
            </div>

            <div className="bodyV4LabelRail right">
              {systems.slice(3).map((system) => <BodySystemLabel key={system.key} state={system} icon={SYSTEM_ICONS[system.key]} selected={selectedSystem === system.key} side="right" onSelect={() => setSelectedSystem(system.key)} />)}
            </div>
          </div>

          <BodyTimeline
            history={history.data}
            selectedDate={selectedDate}
            comparisonDate={comparisonDate}
            onChange={setSelectedDate}
            onPinComparison={setComparisonDate}
            asOfDate={asOfDate}
            windowDays={windowDays}
            onWindowChange={changeWindow}
          />
        </section>

        <BodyDossier key={scope?.dataUserId ?? 'none'} system={selected} history={history.data}
          selectedDate={selectedDate} comparisonDate={comparisonDate} model={model}
          loading={history.loading} error={history.error} onOpenTrend={openTrend} />
      </div>
      </details>
    </div>
  );
}
