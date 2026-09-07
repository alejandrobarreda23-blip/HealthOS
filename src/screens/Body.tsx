import { Activity, CircleGauge, Dumbbell, HeartPulse, Moon, Waves } from 'lucide-react';
import BodyMap from '../components/BodyMap';
import { useHealthBriefV1 } from '../hooks/useHealthBrief';
import { useAcquisition } from '../hooks/useAcquisition';

function metricText(current: number | null | undefined, unit: string, baseline?: number | null) {
  if (current !== null && current !== undefined) return `${Math.round(current)} ${unit}`;
  if (baseline !== null && baseline !== undefined) return `Referencia ${Math.round(baseline)} ${unit}`;
  return 'Sin caracterización suficiente';
}

function sleepText(current: number | null | undefined, baseline?: number | null) {
  const value = current ?? baseline;
  if (value === null || value === undefined) return 'Sin caracterización suficiente';
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return `${current == null ? 'Referencia ' : ''}${hours} h ${minutes} min`;
}

export default function Body() {
  const brief = useHealthBriefV1();
  const acquisition = useAcquisition();
  const data = brief.data;
  const coverage = data?.dataQuality.overallCoverage ?? 0;
  const sourceSignal = acquisition.data?.sourceSignals[0] ?? null;
  const hasRecentPhysiology = coverage >= 0.25 && Boolean(
    data?.recovery.hrv?.current ?? data?.recovery.restingHr?.current ?? data?.sleep.duration?.current
  );
  const activeFinding = data?.activeFindings[0] ?? null;
  const noAction = !activeFinding && !sourceSignal && coverage >= .75;

  const systemCards = [
    { key:'autonomic', icon: Waves, title:'Autonómico', headline: data?.recovery.hrv?.status === 'ok' ? 'Señal reciente disponible' : 'Referencia longitudinal', detail: metricText(data?.recovery.hrv?.current, 'ms', data?.recovery.hrv?.baseline?.median) },
    { key:'cardio', icon: HeartPulse, title:'Cardiorrespiratorio', headline: data?.recovery.restingHr?.status === 'ok' ? 'Señal reciente disponible' : 'Cobertura parcial', detail: metricText(data?.recovery.restingHr?.current, 'bpm', data?.recovery.restingHr?.baseline?.median) },
    { key:'sleep', icon: Moon, title:'Sueño', headline: data?.sleep.duration?.status === 'ok' ? 'Señal reciente disponible' : 'Referencia longitudinal', detail: sleepText(data?.sleep.duration?.current, data?.sleep.duration?.baseline?.median) },
    { key:'musculo', icon: Dumbbell, title:'Musculoesquelético', headline: data?.training.sessions7d ? `${data.training.sessions7d} sesiones · 7 d` : 'Sin carga reciente observada', detail: data ? `${Math.round(data.training.durationMinutes7d)} min · ${Math.round(data.training.elevationGainM7d)} m+` : 'Sin datos' },
    { key:'metabolic', icon: CircleGauge, title:'Metabólico', headline: data?.body.weightKg != null ? 'Peso observado' : 'Caracterización incompleta', detail: data?.body.weightKg != null ? `${data.body.weightKg.toFixed(1)} kg` : 'Peso / laboratorio pendientes' },
    { key:'recovery', icon: Activity, title:'Recuperación', headline: coverage >= .5 ? 'Observabilidad suficiente' : 'Cobertura reciente limitada', detail: `${Math.round(coverage * 100)}% cobertura reciente` },
  ];

  return <div className="bodyScreen">
    <header className="bodyHeader">
      <div><div className="eyebrow">HEALTH OS · MAPA SISTÉMICO</div><h1>Cuerpo</h1><p className="pageLead muted">Índice fisiológico navegable. El cuerpo muestra observación, procedencia, perturbación y ausencia; no emite un veredicto.</p></div>
      <div className={`bodyStatePill ${noAction ? 'calm' : ''}`}><span />{noAction ? 'Nada requiere atención' : sourceSignal ? 'Observabilidad incompleta' : activeFinding ? 'Hay un hallazgo activo' : 'Estado actual limitado por cobertura'}</div>
    </header>

    <div className="bodyWorkspace">
      <section className="bodyCanvasPanel">
        <div className="bodySystemRail bodySystemRailLeft">
          {systemCards.slice(0,3).map(({key,icon:Icon,title,headline,detail}) => <article className="bodySystemCard" key={key}><div className="bodySystemIcon"><Icon size={18}/></div><div><strong>{title}</strong><span>{headline}</span><small>{detail}</small></div></article>)}
        </div>

        <div className="bodyCanvasCore">
          <BodyMap coverage={coverage} hasRecentPhysiology={hasRecentPhysiology} hasSourceDiscontinuity={Boolean(sourceSignal)} activeFindings={data?.activeFindings ?? []}/>
          <div className="bodyTimeline">
            <div className="bodyTimelineTop"><span>Historia fisiológica</span><strong>{data?.date ?? new Date().toISOString().slice(0,10)}</strong></div>
            <div className="bodyTimelineTrack"><i style={{left:`${Math.max(3,Math.min(97,coverage*100))}%`}} /><span className={sourceSignal ? 'gap' : ''}/></div>
            <div className="bodyTimelineLegend"><small>pasado</small><small>hoy</small></div>
          </div>
        </div>

        <div className="bodySystemRail bodySystemRailRight">
          {systemCards.slice(3).map(({key,icon:Icon,title,headline,detail}) => <article className="bodySystemCard" key={key}><div className="bodySystemIcon"><Icon size={18}/></div><div><strong>{title}</strong><span>{headline}</span><small>{detail}</small></div></article>)}
        </div>
      </section>

      <aside className="bodyDossier">
        <section className="bodyDossierCard bodyFindingCard">
          <div className="bodyDossierLabel">Expediente activo</div>
          {activeFinding ? <><div className="bodyFindingBeacon"><span/></div><strong>{activeFinding.title}</strong><p>{activeFinding.summary}</p><div className="bodyEvidenceMeta">{activeFinding.evidenceStrength} · {activeFinding.detectorVersion}</div></> : <><div className="bodyCalmMark">✓</div><strong>Sin hallazgos activos</strong><p>La ausencia de un hallazgo no equivale a ausencia de riesgo; significa que el motor determinista no tiene nada activo que señalar ahora.</p></>}
        </section>

        <section className="bodyDossierCard">
          <div className="bodyDossierLabel">Cobertura y continuidad</div>
          <div className="bodyCoverageValue">{Math.round(coverage*100)}<small>%</small></div>
          <div className="bodyCoverageBar"><i style={{width:`${coverage*100}%`}}/></div>
          {sourceSignal ? <p><strong>Fuente sin datos recientes:</strong> {sourceSignal.provider}. Último dato compartido: {sourceSignal.lastObservedAt.slice(0,10)}.</p> : <p>{coverage >= .75 ? 'Cobertura reciente suficiente para los canales observados.' : 'La cobertura reciente limita la caracterización del estado actual.'}</p>}
        </section>

        <section className="bodyDossierCard bodyLegendCard">
          <div className="bodyDossierLabel">Evidencia y procedencia</div>
          <div><span className="legendLine measured"/>Medido <small>dispositivo / laboratorio</small></div>
          <div><span className="legendLine derived"/>Derivado <small>cálculo determinista</small></div>
          <div><span className="legendLine reported"/>Reportado <small>declarado</small></div>
          <div><span className="legendLine inferred"/>Inferido <small>hipótesis / modelo</small></div>
        </section>

        <section className="bodyDossierCard bodyPrincipleCard">
          <div className="bodyDossierLabel">Regla visual</div>
          <p><strong>Color testifica, no juzga.</strong> Movimiento = fisiología medida. Turbulencia = desviación. Ámbar = hallazgo. Niebla = ausencia.</p>
        </section>
      </aside>
    </div>
  </div>;
}
