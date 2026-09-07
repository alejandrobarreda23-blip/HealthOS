import { useMemo, useState } from 'react';
import { Activity, CircleGauge, Dumbbell, HeartPulse, Moon, Waves } from 'lucide-react';
import BodyMap, { type BodySystemKey } from '../components/BodyMap';
import { useHealthBriefV1 } from '../hooks/useHealthBrief';
import { useAcquisition } from '../hooks/useAcquisition';

function metricText(current: number | null | undefined, unit: string, baseline?: number | null) {
  if (current !== null && current !== undefined) return `${Math.round(current)} ${unit}`;
  if (baseline !== null && baseline !== undefined) return `Ref. ${Math.round(baseline)} ${unit}`;
  return 'Sin caracterización suficiente';
}

function sleepText(current: number | null | undefined, baseline?: number | null) {
  const value = current ?? baseline;
  if (value === null || value === undefined) return 'Sin caracterización suficiente';
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return `${current == null ? 'Ref. ' : ''}${hours} h ${minutes} min`;
}

export default function Body() {
  const brief = useHealthBriefV1();
  const acquisition = useAcquisition();
  const data = brief.data;
  const coverage = data?.dataQuality.overallCoverage ?? 0;
  const sourceSignal = acquisition.data?.sourceSignals[0] ?? null;
  const hasRecentPhysiology = coverage >= 0.25 && Boolean(data?.recovery.hrv?.current ?? data?.recovery.restingHr?.current ?? data?.sleep.duration?.current);
  const activeFinding = data?.activeFindings[0] ?? null;
  const noAction = !activeFinding && !sourceSignal && coverage >= .75;
  const [selectedSystem, setSelectedSystem] = useState<BodySystemKey>('cardio');

  const systemCards = useMemo(() => [
    { key:'autonomic' as const, icon: Waves, title:'Autonómico', headline: data?.recovery.hrv?.status === 'ok' ? 'Señal reciente' : 'Referencia longitudinal', detail: metricText(data?.recovery.hrv?.current, 'ms', data?.recovery.hrv?.baseline?.median) },
    { key:'cardio' as const, icon: HeartPulse, title:'Cardiorrespiratorio', headline: data?.recovery.restingHr?.status === 'ok' ? 'Señal reciente' : 'Cobertura parcial', detail: metricText(data?.recovery.restingHr?.current, 'bpm', data?.recovery.restingHr?.baseline?.median) },
    { key:'sleep' as const, icon: Moon, title:'Sueño', headline: data?.sleep.duration?.status === 'ok' ? 'Señal reciente' : 'Referencia longitudinal', detail: sleepText(data?.sleep.duration?.current, data?.sleep.duration?.baseline?.median) },
    { key:'musculo' as const, icon: Dumbbell, title:'Musculoesquelético', headline: data?.training.sessions7d ? `${data.training.sessions7d} sesiones · 7 d` : 'Sin carga reciente', detail: data ? `${Math.round(data.training.durationMinutes7d)} min · ${Math.round(data.training.elevationGainM7d)} m+` : 'Sin datos' },
    { key:'metabolic' as const, icon: CircleGauge, title:'Metabólico', headline: data?.body.weightKg != null ? 'Peso observado' : 'Caracterización incompleta', detail: data?.body.weightKg != null ? `${data.body.weightKg.toFixed(1)} kg` : 'Peso / laboratorio pendientes' },
    { key:'recovery' as const, icon: Activity, title:'Recuperación', headline: coverage >= .5 ? 'Observabilidad suficiente' : 'Cobertura limitada', detail: `${Math.round(coverage * 100)}% cobertura reciente` },
  ], [coverage, data]);

  const selected = systemCards.find((card) => card.key === selectedSystem) ?? systemCards[0];

  return <div className="bodyScreen">
    <header className="bodyHeader">
      <div><div className="eyebrow">HEALTH OS · MAPA SISTÉMICO</div><h1>Cuerpo</h1><p className="pageLead muted">Un índice navegable de observación, procedencia, ausencia y respuesta. No es un semáforo clínico.</p></div>
      <div className={`bodyStatePill ${noAction ? 'calm' : ''}`}><span />{noAction ? 'Nada requiere atención' : sourceSignal ? 'Observabilidad incompleta' : activeFinding ? 'Hallazgo activo' : 'Estado limitado por cobertura'}</div>
    </header>

    <div className="bodyWorkspace">
      <section className="bodyCanvasPanel">
        <div className="bodySystemRail bodySystemRailLeft">
          {systemCards.slice(0,3).map(({key,icon:Icon,title,headline,detail}) => <button className={`bodySystemCard ${selectedSystem === key ? 'selected' : ''}`} key={key} onClick={() => setSelectedSystem(key)}><div className="bodySystemIcon"><Icon size={18}/></div><div><strong>{title}</strong><span>{headline}</span><small>{detail}</small></div></button>)}
        </div>

        <div className="bodyCanvasCore">
          <div className="bodyCoreCaption"><span>Organismo</span><strong>{hasRecentPhysiology ? 'fisiología reciente elegible' : 'historia visible · presente limitado'}</strong></div>
          <BodyMap coverage={coverage} hasRecentPhysiology={hasRecentPhysiology} hasSourceDiscontinuity={Boolean(sourceSignal)} activeFindings={data?.activeFindings ?? []} selectedSystem={selectedSystem} onSelectSystem={setSelectedSystem}/>
          <div className="bodyTimeline">
            <div className="bodyTimelineTop"><span>Historia fisiológica</span><strong>{data?.date ?? new Date().toISOString().slice(0,10)}</strong></div>
            <div className="bodyTimelineTrack"><i style={{left:`${Math.max(3,Math.min(97,coverage*100))}%`}} /><span className={sourceSignal ? 'gap' : ''}/></div>
            <div className="bodyTimelineLegend"><small>historia</small><small>hoy</small></div>
          </div>
        </div>

        <div className="bodySystemRail bodySystemRailRight">
          {systemCards.slice(3).map(({key,icon:Icon,title,headline,detail}) => <button className={`bodySystemCard ${selectedSystem === key ? 'selected' : ''}`} key={key} onClick={() => setSelectedSystem(key)}><div className="bodySystemIcon"><Icon size={18}/></div><div><strong>{title}</strong><span>{headline}</span><small>{detail}</small></div></button>)}
        </div>
      </section>

      <aside className="bodyDossier">
        <section className="bodyDossierCard bodySelectedCard">
          <div className="bodyDossierLabel">Sistema seleccionado</div>
          <div className="bodySelectedIcon"><selected.icon size={19}/></div>
          <strong>{selected.title}</strong><p>{selected.headline}</p><div className="bodySelectedValue">{selected.detail}</div>
          <div className="bodyDossierFoot">El detalle procede sólo de canales ya existentes en HealthOS.</div>
        </section>

        <section className="bodyDossierCard bodyFindingCard">
          <div className="bodyDossierLabel">Expediente activo</div>
          {activeFinding ? <><div className="bodyFindingBeacon"><span/></div><strong>{activeFinding.title}</strong><p>{activeFinding.summary}</p><div className="bodyEvidenceMeta">{activeFinding.evidenceStrength} · {activeFinding.detectorVersion}</div></> : <><div className="bodyCalmMark">✓</div><strong>Sin hallazgos activos</strong><p>El motor determinista no tiene nada activo que señalar ahora.</p></>}
        </section>

        <section className="bodyDossierCard">
          <div className="bodyDossierLabel">Cobertura y continuidad</div>
          <div className="bodyCoverageValue">{Math.round(coverage*100)}<small>%</small></div>
          <div className="bodyCoverageBar"><i style={{width:`${coverage*100}%`}}/></div>
          {sourceSignal ? <p><strong>Fuente sin datos recientes:</strong> {sourceSignal.provider}. Último dato: {sourceSignal.lastObservedAt.slice(0,10)}.</p> : <p>{coverage >= .75 ? 'Cobertura reciente suficiente para los canales observados.' : 'La cobertura reciente limita la caracterización del estado actual.'}</p>}
        </section>

        <section className="bodyDossierCard bodyLegendCard">
          <div className="bodyDossierLabel">Gramática visual</div>
          <div><span className="legendLine measured"/>Medido <small>trazo continuo</small></div>
          <div><span className="legendLine derived"/>Derivado <small>cálculo determinista</small></div>
          <div><span className="legendLine reported"/>Reportado <small>declarado</small></div>
          <div><span className="legendLine inferred"/>Inferido <small>hipótesis / modelo</small></div>
        </section>
      </aside>
    </div>
  </div>;
}
