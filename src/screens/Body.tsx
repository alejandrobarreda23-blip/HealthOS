import { useEffect, useMemo, useState } from 'react';
import { Activity, CircleGauge, Dumbbell, HeartPulse, Moon, Waves } from 'lucide-react';
import BodyFigure from '../components/body/BodyFigure';
import BodySystemCard from '../components/body/BodySystemCard';
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

function hasMeasured(evidence: BodyEvidenceKind[]) {
  return evidence.includes('measured');
}

function historicalSystems(day: BodyHistoryDay | null): BodySystemState[] {
  const metric = (key: string) => day?.metrics[key] ?? null;
  const hrv = metric('hrv_rmssd');
  const rhr = metric('resting_heart_rate');
  const sleep = metric('sleep_duration');
  const spo2 = metric('oxygen_saturation');
  const steps = metric('steps');
  const weight = metric('weight');

  const make = (
    key: BodySystemKey,
    coverage: number,
    headline: string,
    detail: string,
    evidenceKinds: BodyEvidenceKind[],
  ): BodySystemState => ({
    key,
    title: SYSTEM_LABEL[key],
    headline,
    detail,
    coverage,
    status: coverageStatus(coverage),
    evidenceKinds,
    finding: null,
    hasExactDaySignal: coverage > 0,
    canAnimate: coverage > 0 && hasMeasured(evidenceKinds),
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
    make(
      'autonomic',
      autonomicCoverage,
      autonomicCoverage ? 'Señal observada en la fecha' : 'Sin observación ese día',
      hrv ? `HRV ${formatBodyValue(hrv.value, hrv.unit ?? 'ms')}` : rhr ? `FC reposo ${formatBodyValue(rhr.value, rhr.unit ?? 'bpm')}` : 'Hueco explícito',
      autonomicEvidence,
    ),
    make(
      'cardio',
      cardioCoverage,
      cardioCoverage ? 'Canales cardiorrespiratorios presentes' : 'Sin observación ese día',
      rhr ? `FC reposo ${formatBodyValue(rhr.value, rhr.unit ?? 'bpm')}` : spo2 ? `SpO₂ ${formatBodyValue(spo2.value, spo2.unit ?? '%')}` : 'Hueco explícito',
      cardioEvidence,
    ),
    make(
      'sleep',
      sleepCoverage,
      sleepCoverage ? 'Sueño disponible en la fecha' : 'Sin observación ese día',
      sleep ? formatSleepMinutes(sleep.value) : 'Hueco explícito',
      sleepEvidence,
    ),
    make(
      'musculo',
      musculoCoverage,
      day?.exerciseCount ? `${day.exerciseCount} sesión${day.exerciseCount === 1 ? '' : 'es'} observada${day.exerciseCount === 1 ? '' : 's'}` : steps ? 'Actividad diaria observada' : 'Sin carga observada',
      day?.exerciseCount ? `${Math.round(day.exerciseMinutes)} min · ${Math.round(day.exerciseElevationM)} m+` : steps ? `${Math.round(steps.value).toLocaleString('es-ES')} pasos` : 'Hueco explícito',
      musculoEvidence,
    ),
    make(
      'metabolic',
      metabolicCoverage,
      weight ? 'Peso observado en la fecha' : 'Caracterización metabólica ausente',
      weight ? formatBodyValue(weight.value, weight.unit ?? 'kg') : 'Sin peso / laboratorio en esta fecha',
      metabolicEvidence,
    ),
    make(
      'recovery',
      recoveryCoverage,
      recoveryCoverage ? 'Canales de recuperación observados' : 'Sin señal suficiente ese día',
      recoveryCoverage ? `${Math.round(recoveryCoverage * 100)}% de canales disponibles` : 'Hueco explícito',
      recoveryEvidence,
    ),
  ];
}

export default function Body() {
  const brief = useHealthBriefV1();
  const acquisition = useAcquisition();
  const data = brief.data;
  const asOfDate = data?.date ?? new Date().toISOString().slice(0, 10);
  const history = useBodyHistory(asOfDate, 365);
  const [selectedSystem, setSelectedSystem] = useState<BodySystemKey>('cardio');
  const [selectedDate, setSelectedDate] = useState(asOfDate);

  useEffect(() => {
    setSelectedDate(asOfDate);
  }, [asOfDate]);

  const isPresent = selectedDate === asOfDate;
  const selectedDay = history.data?.days.find((day) => day.date === selectedDate) ?? null;
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

    const make = (
      key: BodySystemKey,
      coverage: number,
      headline: string,
      detail: string,
      evidenceKinds: BodyEvidenceKind[],
    ): BodySystemState => ({
      key,
      title: SYSTEM_LABEL[key],
      headline,
      detail,
      coverage,
      status: coverageStatus(coverage),
      evidenceKinds: evidenceKinds.length ? evidenceKinds : (data ? (['derived'] as BodyEvidenceKind[]) : []),
      finding: findingFor(key),
      hasExactDaySignal: Boolean(exact && coverage > 0),
      canAnimate: hasMeasured(evidenceKinds),
    });

    const hrvCoverage = metricCoverage(data, 'hrv_rmssd');
    const rhrCoverage = metricCoverage(data, 'resting_heart_rate');
    const sleepCoverage = metricCoverage(data, 'sleep_duration');
    const spo2Coverage = metricCoverage(data, 'oxygen_saturation');
    const stepsCoverage = metricCoverage(data, 'steps');

    return [
      make(
        'autonomic',
        average([hrvCoverage, rhrCoverage]),
        data?.recovery.hrv?.current != null ? 'Señal reciente disponible' : 'Referencia longitudinal',
        data?.recovery.hrv?.current != null
          ? `HRV ${formatBodyValue(data.recovery.hrv.current, 'ms')}`
          : data?.recovery.hrv?.baseline?.median != null
            ? `Ref. ${formatBodyValue(data.recovery.hrv.baseline.median, 'ms')}`
            : 'Sin caracterización suficiente',
        autonomicEvidence,
      ),
      make(
        'cardio',
        average([rhrCoverage, spo2Coverage]),
        data?.recovery.restingHr?.current != null ? 'Señal reciente disponible' : 'Cobertura cardiorrespiratoria parcial',
        data?.recovery.restingHr?.current != null
          ? `FC reposo ${formatBodyValue(data.recovery.restingHr.current, 'bpm')}`
          : data?.recovery.restingHr?.baseline?.median != null
            ? `Ref. ${formatBodyValue(data.recovery.restingHr.baseline.median, 'bpm')}`
            : 'Sin caracterización suficiente',
        cardioEvidence,
      ),
      make(
        'sleep',
        sleepCoverage,
        data?.sleep.duration?.current != null ? 'Sueño reciente disponible' : 'Referencia longitudinal',
        data?.sleep.duration?.current != null
          ? formatSleepMinutes(data.sleep.duration.current)
          : data?.sleep.duration?.baseline?.median != null
            ? `Ref. ${formatSleepMinutes(data.sleep.duration.baseline.median)}`
            : 'Sin caracterización suficiente',
        sleepEvidence,
      ),
      make(
        'musculo',
        average([stepsCoverage, data?.training.sessions7d ? 1 : 0]),
        data?.training.sessions7d ? `${data.training.sessions7d} sesiones · 7 días` : 'Sin carga reciente observada',
        data?.training.sessions7d
          ? `${Math.round(data.training.durationMinutes7d)} min · ${Math.round(data.training.elevationGainM7d)} m+`
          : 'Sin sesión reciente en el runtime',
        musculoEvidence,
      ),
      make(
        'metabolic',
        data?.body.weightKg != null ? 0.35 : 0,
        data?.body.weightKg != null ? 'Peso disponible; sistema aún incompleto' : 'Caracterización metabólica incompleta',
        data?.body.weightKg != null ? `${data.body.weightKg.toFixed(1)} kg` : 'Peso / laboratorio pendientes',
        metabolicEvidence,
      ),
      make(
        'recovery',
        average([hrvCoverage, rhrCoverage, sleepCoverage]),
        (data?.dataQuality.overallCoverage ?? 0) >= 0.5 ? 'Observabilidad de recuperación útil' : 'Cobertura reciente limitada',
        `${Math.round((data?.dataQuality.overallCoverage ?? 0) * 100)}% cobertura reciente global`,
        recoveryEvidence,
      ),
    ];
  }, [currentFindings, data, isPresent, selectedDay]);

  const selected = systems.find((system) => system.key === selectedSystem) ?? systems[0];
  const SelectedIcon = SYSTEM_ICONS[selected.key];
  const globalCoverage = isPresent
    ? (data?.dataQuality.overallCoverage ?? 0)
    : (selectedDay?.coverage ?? 0);
  const currentDataQualityFinding = currentFindings.find((finding) => finding.domain === 'data_quality') ?? null;
  const selectedFinding = isPresent ? selected.finding : null;
  const historicalGap = !isPresent && !selectedDay;

  const stateLabel = !isPresent
    ? historicalGap ? 'Hueco histórico' : `Historia · ${selectedDate}`
    : sourceSignal ? 'Observabilidad incompleta'
      : currentDataQualityFinding ? 'Cobertura limitada'
        : currentFindings.length ? 'Hallazgo activo'
          : 'Presente observado';

  const evidenceLabel = selected.evidenceKinds.length
    ? selected.evidenceKinds.join(' · ')
    : 'sin procedencia en la fecha';

  return (
    <div className="bodyScreen bodyV3Screen">
      <header className="bodyHeader bodyV3Header">
        <div>
          <div className="eyebrow">HEALTH OS · ORGANISMO</div>
          <h1>Cuerpo</h1>
          <p className="pageLead muted">Navega la historia como un organismo: señal, procedencia, continuidad y ausencia. El cuerpo no emite un veredicto.</p>
        </div>
        <div className={`bodyStatePill ${historicalGap ? 'gap' : ''}`}><span />{stateLabel}</div>
      </header>

      {(history.error || brief.error) && (
        <div className="bodyV3LoadNotice">{history.error || brief.error}</div>
      )}

      <div className="bodyV3Workspace">
        <section className="bodyV3Stage">
          <div className="bodyV3StageTopline">
            <div><span>Fecha explorada</span><strong>{selectedDate}</strong></div>
            <div><span>Observabilidad</span><strong>{Math.round(globalCoverage * 100)}%</strong></div>
            <div><span>Último dato visible</span><strong>{history.data?.latestObservedDate ?? '—'}</strong></div>
          </div>

          <div className="bodyV3StageGrid">
            <div className="bodyV3SystemRail bodyV3SystemRailLeft">
              {systems.slice(0, 3).map((system) => (
                <BodySystemCard
                  key={system.key}
                  state={system}
                  icon={SYSTEM_ICONS[system.key]}
                  selected={selectedSystem === system.key}
                  onSelect={() => setSelectedSystem(system.key)}
                />
              ))}
            </div>

            <div className="bodyV3Center">
              <BodyFigure
                systems={systems}
                selectedSystem={selectedSystem}
                onSelectSystem={setSelectedSystem}
                isPresent={isPresent}
              />
            </div>

            <div className="bodyV3SystemRail bodyV3SystemRailRight">
              {systems.slice(3).map((system) => (
                <BodySystemCard
                  key={system.key}
                  state={system}
                  icon={SYSTEM_ICONS[system.key]}
                  selected={selectedSystem === system.key}
                  onSelect={() => setSelectedSystem(system.key)}
                />
              ))}
            </div>
          </div>

          <BodyTimeline
            history={history.data}
            selectedDate={selectedDate}
            onChange={setSelectedDate}
            asOfDate={asOfDate}
          />
        </section>

        <aside className="bodyV3Inspector">
          <section className="bodyV3InspectorCard bodyV3SelectedSystem">
            <div className="bodyDossierLabel">Sistema seleccionado</div>
            <div className="bodyV3InspectorIcon"><SelectedIcon size={19} strokeWidth={1.7} /></div>
            <h2>{selected.title}</h2>
            <p>{selected.headline}</p>
            <div className="bodyV3InspectorValue">{selected.detail}</div>
            <div className="bodyV3InspectorCoverage"><i style={{ width: `${selected.coverage * 100}%` }} /></div>
            <div className="bodyV3EvidenceRow">
              <span>Procedencia visual</span>
              <strong>{evidenceLabel}</strong>
            </div>
          </section>

          <section className="bodyV3InspectorCard bodyV3FindingCard">
            <div className="bodyDossierLabel">Expediente</div>
            {!isPresent ? (
              <>
                <div className="bodyV3NeutralGlyph">↺</div>
                <h3>Historia sin reinterpretar</h3>
                <p>Body reconstruye observaciones de esta fecha. Los hallazgos históricos no se recalculan ni se proyectan retrospectivamente en esta versión.</p>
              </>
            ) : selectedFinding ? (
              <>
                <div className="bodyFindingBeacon"><span /></div>
                <h3>{selectedFinding.title}</h3>
                <p>{selectedFinding.summary}</p>
                <div className="bodyEvidenceMeta">{selectedFinding.evidenceStrength} · {selectedFinding.detectorVersion}</div>
              </>
            ) : currentDataQualityFinding ? (
              <>
                <div className="bodyV3NeutralGlyph">···</div>
                <h3>Presente limitado por observabilidad</h3>
                <p>{currentDataQualityFinding.summary}</p>
                <div className="bodyEvidenceMeta">Calidad de datos · no fisiológico</div>
              </>
            ) : (
              <>
                <div className="bodyCalmMark">✓</div>
                <h3>Sin expediente activo aquí</h3>
                <p>No hay un hallazgo determinista activo asociado a este sistema.</p>
              </>
            )}
          </section>

          <section className="bodyV3InspectorCard">
            <div className="bodyDossierLabel">Continuidad</div>
            <div className="bodyCoverageValue">{Math.round(globalCoverage * 100)}<small>%</small></div>
            <div className="bodyCoverageBar"><i style={{ width: `${globalCoverage * 100}%` }} /></div>
            {!isPresent ? (
              <p>{selectedDay ? 'Cobertura exacta de los cinco canales pasivos nucleares disponibles en la fecha explorada.' : 'No existe observación fisiológica normalizada para esta fecha. El hueco permanece visible.'}</p>
            ) : sourceSignal ? (
              <p><strong>Fuente sin datos recientes:</strong> {sourceSignal.provider}. Último dato detectado: {sourceSignal.lastObservedAt.slice(0, 10)}.</p>
            ) : (
              <p>La cobertura describe observabilidad del dato; no equivale a salud ni a normalidad.</p>
            )}
          </section>

          <section className="bodyV3InspectorCard bodyV3GrammarCard">
            <div className="bodyDossierLabel">Gramática</div>
            <div><span className="legendLine measured" /><b>Medido</b><small>puede habilitar movimiento</small></div>
            <div><span className="legendLine derived" /><b>Derivado</b><small>cálculo determinista</small></div>
            <div><span className="legendLine reported" /><b>Reportado</b><small>contexto declarado</small></div>
            <div><span className="legendLine inferred" /><b>Inferido</b><small>hipótesis / modelo</small></div>
            <p className="bodyV3GrammarRule">Color testifica. Movimiento mide. Niebla admite ignorancia. Ámbar abre evidencia.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
