import { useEffect, useMemo, useState } from 'react';
import { Activity, CircleGauge, Dumbbell, HeartPulse, Moon, Waves } from 'lucide-react';
import BodyDossier from '../components/body/BodyDossier';
import BodyFigureV4, { type BodyVisualMode } from '../components/body/BodyFigureV4';
import BodySystemLabel from '../components/body/BodySystemLabel';
import BodyTimeline from '../components/body/BodyTimeline';
import {
  coverageStatus,
  findingSystem,
  formatBodyValue,
  formatSleepMinutes,
  type BodyEvidenceKind,
  type BodyHistoryDay,
  type BodySystemKey,
  type BodySystemState,
} from '../body/view-state';
import { useHealthBriefV1 } from '../hooks/useHealthBrief';
import { useAcquisition } from '../hooks/useAcquisition';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { bodySystemConfig } from '../body/system-config';

const SYSTEM_ICONS = {
  autonomic: Waves,
  cardio: HeartPulse,
  sleep: Moon,
  musculo: Dumbbell,
  metabolic: CircleGauge,
  recovery: Activity,
} satisfies Record<BodySystemKey, typeof Activity>;

const SYSTEM_LABEL: Record<BodySystemKey, string> = {
  autonomic: 'Autonómico',
  cardio: 'Cardiorrespiratorio',
  sleep: 'Sueño',
  musculo: 'Musculoesquelético',
  metabolic: 'Metabólico',
  recovery: 'Recuperación',
};

interface Props {
  onOpenTrend?: (metricKey: string) => void;
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function metricCoverage(data: ReturnType<typeof useHealthBriefV1>['data'], key: string) {
  return data?.dataQuality.byMetric[key]?.coverage ?? 0;
}

function exactEvidence(day: BodyHistoryDay | null, metricKeys: string[], includeExercise = false): BodyEvidenceKind[] {
  if (!day) return [];
  const result = metricKeys.map((key) => day.metrics[key]?.evidence).filter((x): x is BodyEvidenceKind => Boolean(x));
  if (includeExercise && day.exerciseCount > 0) result.push(...day.evidenceKinds.filter((x) => x === 'measured'));
  return [...new Set(result)];
}

function hasMeasured(evidence: BodyEvidenceKind[]) { return evidence.includes('measured'); }

function historicalSystems(day: BodyHistoryDay | null): BodySystemState[] {
  const metric = (key: string) => day?.metrics[key] ?? null;
  const hrv = metric('hrv_rmssd'); const rhr = metric('resting_heart_rate'); const sleep = metric('sleep_duration');
  const spo2 = metric('oxygen_saturation'); const steps = metric('steps'); const weight = metric('weight');
  const make = (key: BodySystemKey, coverage: number, headline: string, detail: string, evidenceKinds: BodyEvidenceKind[]): BodySystemState => ({
    key, title: SYSTEM_LABEL[key], headline, detail, coverage, status: coverageStatus(coverage), evidenceKinds,
    finding: null, hasExactDaySignal: coverage > 0, canAnimate: coverage > 0 && hasMeasured(evidenceKinds),
  });
  const autonomicEvidence = exactEvidence(day, ['hrv_rmssd', 'resting_heart_rate']);
  const cardioEvidence = exactEvidence(day, ['resting_heart_rate', 'oxygen_saturation']);
  const sleepEvidence = exactEvidence(day, ['sleep_duration']);
  const musculoEvidence = exactEvidence(day, ['steps'], true);
  const metabolicEvidence = exactEvidence(day, ['weight']);
  const recoveryEvidence = exactEvidence(day, ['hrv_rmssd', 'resting_heart_rate', 'sleep_duration'], true);
  const autonomicCoverage = [hrv, rhr].filter(Boolean).length / 2;
  const cardioCoverage = [rhr, spo2].filter(Boolean).length / 2;
  const sleepCoverage = sleep ? 1 : 0;
  const musculoCoverage = ((steps ? 1 : 0) + (day?.exerciseCount ? 1 : 0)) / 2;
  const metabolicCoverage = weight ? 1 : 0;
  const recoveryCoverage = [hrv, rhr, sleep].filter(Boolean).length / 3;
  return [
    make('autonomic', autonomicCoverage, autonomicCoverage ? 'Señal observada en la fecha' : 'Sin observación ese día', hrv ? `HRV ${formatBodyValue(hrv.value, hrv.unit ?? 'ms')}` : rhr ? `FC reposo ${formatBodyValue(rhr.value, rhr.unit ?? 'bpm')}` : 'Hueco explícito', autonomicEvidence),
    make('cardio', cardioCoverage, cardioCoverage ? 'Canales cardiorrespiratorios presentes' : 'Sin observación ese día', rhr ? `FC reposo ${formatBodyValue(rhr.value, rhr.unit ?? 'bpm')}` : spo2 ? `SpO₂ ${formatBodyValue(spo2.value, spo2.unit ?? '%')}` : 'Hueco explícito', cardioEvidence),
    make('sleep', sleepCoverage, sleepCoverage ? 'Sueño disponible en la fecha' : 'Sin observación ese día', sleep ? formatSleepMinutes(sleep.value) : 'Hueco explícito', sleepEvidence),
    make('musculo', musculoCoverage, day?.exerciseCount ? `${day.exerciseCount} sesión${day.exerciseCount === 1 ? '' : 'es'} observada${day.exerciseCount === 1 ? '' : 's'}` : steps ? 'Actividad diaria observada' : 'Sin carga observada', day?.exerciseCount ? `${Math.round(day.exerciseMinutes)} min · ${Math.round(day.exerciseElevationM)} m+` : steps ? `${Math.round(steps.value).toLocaleString('es-ES')} pasos` : 'Hueco explícito', musculoEvidence),
    make('metabolic', metabolicCoverage, weight ? 'Peso observado en la fecha' : 'Caracterización metabólica ausente', weight ? formatBodyValue(weight.value, weight.unit ?? 'kg') : 'Sin peso / laboratorio en esta fecha', metabolicEvidence),
    make('recovery', recoveryCoverage, recoveryCoverage ? 'Canales de recuperación observados' : 'Sin señal suficiente ese día', recoveryCoverage ? `${Math.round(recoveryCoverage * 100)}% de canales disponibles` : 'Hueco explícito', recoveryEvidence),
  ];
}

export default function Body({ onOpenTrend }: Props) {
  const brief = useHealthBriefV1();
  const acquisition = useAcquisition();
  const data = brief.data;
  const asOfDate = data?.date ?? new Date().toISOString().slice(0, 10);
  const history = useBodyHistory(asOfDate, 365);
  const [selectedSystem, setSelectedSystem] = useState<BodySystemKey>('cardio');
  const [selectedDate, setSelectedDate] = useState(asOfDate);
  const [comparisonDate, setComparisonDate] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(365);
  const [mode, setMode] = useState<BodyVisualMode>('state');

  useEffect(() => { setSelectedDate(asOfDate); setComparisonDate(null); }, [asOfDate]);

  const isPresent = selectedDate === asOfDate;
  const selectedDay = history.data?.days.find((day) => day.date === selectedDate) ?? null;
  const comparisonDay = comparisonDate ? history.data?.days.find((day) => day.date === comparisonDate) ?? null : null;
  const sourceSignal = acquisition.data?.sourceSignals[0] ?? null;
  const currentFindings = data?.activeFindings ?? [];

  const systems = useMemo<BodySystemState[]>(() => {
    if (!isPresent) return historicalSystems(selectedDay);
    const findingFor = (key: BodySystemKey) => currentFindings.find((finding) => findingSystem(finding) === key) ?? null;
    const exact = selectedDay;
    const autonomicEvidence = exactEvidence(exact, ['hrv_rmssd', 'resting_heart_rate']);
    const cardioEvidence = exactEvidence(exact, ['resting_heart_rate', 'oxygen_saturation']);
    const sleepEvidence = exactEvidence(exact, ['sleep_duration']);
    const musculoEvidence = exactEvidence(exact, ['steps'], true);
    const metabolicEvidence = exactEvidence(exact, ['weight']);
    const recoveryEvidence = exactEvidence(exact, ['hrv_rmssd', 'resting_heart_rate', 'sleep_duration'], true);
    const make = (key: BodySystemKey, coverage: number, headline: string, detail: string, evidenceKinds: BodyEvidenceKind[]): BodySystemState => ({
      key, title: SYSTEM_LABEL[key], headline, detail, coverage, status: coverageStatus(coverage),
      evidenceKinds: evidenceKinds.length ? evidenceKinds : (data ? ['derived'] as BodyEvidenceKind[] : []),
      finding: findingFor(key), hasExactDaySignal: Boolean(exact && coverage > 0), canAnimate: hasMeasured(evidenceKinds),
    });
    const hrvCoverage = metricCoverage(data, 'hrv_rmssd'); const rhrCoverage = metricCoverage(data, 'resting_heart_rate');
    const sleepCoverage = metricCoverage(data, 'sleep_duration'); const spo2Coverage = metricCoverage(data, 'oxygen_saturation'); const stepsCoverage = metricCoverage(data, 'steps');
    return [
      make('autonomic', average([hrvCoverage, rhrCoverage]), data?.recovery.hrv?.current != null ? 'Señal reciente disponible' : 'Referencia longitudinal', data?.recovery.hrv?.current != null ? `HRV ${formatBodyValue(data.recovery.hrv.current, 'ms')}` : data?.recovery.hrv?.baseline?.median != null ? `Ref. ${formatBodyValue(data.recovery.hrv.baseline.median, 'ms')}` : 'Sin caracterización suficiente', autonomicEvidence),
      make('cardio', average([rhrCoverage, spo2Coverage]), data?.recovery.restingHr?.current != null ? 'Señal reciente disponible' : 'Cobertura cardiorrespiratoria parcial', data?.recovery.restingHr?.current != null ? `FC reposo ${formatBodyValue(data.recovery.restingHr.current, 'bpm')}` : data?.recovery.restingHr?.baseline?.median != null ? `Ref. ${formatBodyValue(data.recovery.restingHr.baseline.median, 'bpm')}` : 'Sin caracterización suficiente', cardioEvidence),
      make('sleep', sleepCoverage, data?.sleep.duration?.current != null ? 'Sueño reciente disponible' : 'Referencia longitudinal', data?.sleep.duration?.current != null ? formatSleepMinutes(data.sleep.duration.current) : data?.sleep.duration?.baseline?.median != null ? `Ref. ${formatSleepMinutes(data.sleep.duration.baseline.median)}` : 'Sin caracterización suficiente', sleepEvidence),
      make('musculo', average([stepsCoverage, data?.training.sessions7d ? 1 : 0]), data?.training.sessions7d ? `${data.training.sessions7d} sesiones · 7 días` : 'Sin carga reciente observada', data?.training.sessions7d ? `${Math.round(data.training.durationMinutes7d)} min · ${Math.round(data.training.elevationGainM7d)} m+` : 'Sin sesión reciente en el runtime', musculoEvidence),
      make('metabolic', data?.body.weightKg != null ? 0.35 : 0, data?.body.weightKg != null ? 'Peso disponible; sistema aún incompleto' : 'Caracterización metabólica incompleta', data?.body.weightKg != null ? `${data.body.weightKg.toFixed(1)} kg` : 'Peso / laboratorio pendientes', metabolicEvidence),
      make('recovery', average([hrvCoverage, rhrCoverage, sleepCoverage]), (data?.dataQuality.overallCoverage ?? 0) >= 0.5 ? 'Observabilidad de recuperación útil' : 'Cobertura reciente limitada', `${Math.round((data?.dataQuality.overallCoverage ?? 0) * 100)}% cobertura reciente global`, recoveryEvidence),
    ];
  }, [currentFindings, data, isPresent, selectedDay]);

  const selected = systems.find((system) => system.key === selectedSystem) ?? systems[0];
  const globalCoverage = isPresent ? (data?.dataQuality.overallCoverage ?? 0) : (selectedDay?.coverage ?? 0);
  const dataQualityFinding = currentFindings.find((finding) => finding.domain === 'data_quality') ?? null;
  const observedSystems = systems.filter((system) => system.coverage > 0).length;
  const latestObserved = history.data?.latestObservedDate ?? null;
  const historicalGap = !isPresent && !selectedDay;
  const stateLabel = historicalGap ? 'Hueco histórico' : isPresent ? (sourceSignal ? 'Presente limitado' : 'Presente') : `Historia · ${selectedDate}`;

  const openTrend = (metricKey: string) => onOpenTrend?.(metricKey);
  const selectedConfig = bodySystemConfig(selectedSystem);

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

      {(history.error || brief.error) && <div className="bodyV3LoadNotice">{history.error || brief.error}</div>}

      <div className="bodyV4TopMetrics">
        <div><span>Fecha explorada</span><strong>{selectedDate}</strong></div>
        <div><span>Sistemas con señal</span><strong>{observedSystems}<small>/6</small></strong></div>
        <div><span>Observabilidad global</span><strong>{Math.round(globalCoverage * 100)}<small>%</small></strong></div>
        <div><span>Último dato</span><strong>{latestObserved ?? '—'}</strong></div>
        {comparisonDate && <div className="comparison"><span>Comparando con</span><strong>{comparisonDate}</strong><button onClick={() => setComparisonDate(null)}>×</button></div>}
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
            onWindowChange={setWindowDays}
          />
        </section>

        <BodyDossier
          system={selected}
          selectedDay={selectedDay}
          comparisonDay={comparisonDay}
          isPresent={isPresent}
          globalCoverage={globalCoverage}
          sourceProvider={sourceSignal?.provider ?? null}
          sourceLastObservedAt={sourceSignal?.lastObservedAt ?? null}
          dataQualitySummary={isPresent ? dataQualityFinding?.summary ?? null : null}
          onOpenTrend={openTrend}
        />
      </div>
    </div>
  );
}
