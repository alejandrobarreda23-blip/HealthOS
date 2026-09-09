import { useMemo, useState } from 'react';
import {
  Activity,
  Camera,
  Check,
  Clock3,
  Droplets,
  HeartPulse,
  Moon,
  Plus,
  Scale,
  Scissors,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import {
  VISIBLE_AGING_INTERVENTION_OPTIONS,
  VISIBLE_AGING_PHOTO_PROTOCOL_V1,
  type VisibleAgingDomainKey,
  type VisibleAgingPose,
} from '../../aging/visible-aging';
import { useVisibleAging } from '../../hooks/useVisibleAging';
import '../../app/visible-aging.css';

const DOMAIN_ICON: Record<VisibleAgingDomainKey, typeof UserRound> = {
  skin: Droplets,
  face: UserRound,
  hair: Scissors,
  body_posture: Scale,
};

const POSE_LABEL: Record<VisibleAgingPose, string> = {
  front: 'Frontal',
  oblique_45: '45°',
  profile: 'Perfil',
};

function formatDate(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function todayIsoDate() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function valueLabel(
  metric: { current: number | null; reference: number | null; unit: string } | null,
  kind: 'plain' | 'sleep' = 'plain',
) {
  if (!metric || metric.current == null) return '—';
  if (kind === 'sleep' && metric.unit === 'min') return `${(metric.current / 60).toFixed(1)} h`;
  return `${Math.round(metric.current * 10) / 10} ${metric.unit}`;
}

export default function VisibleAging() {
  const {
    scope, passive, domains, sessions, interventions, campaignDue,
    daysUntilCampaign, nextCampaignDate, loading, error,
    savePhotoCampaign, saveIntervention,
  } = useVisibleAging();

  const [showCampaign, setShowCampaign] = useState(false);
  const [files, setFiles] = useState<Partial<Record<VisibleAgingPose, File>>>({});
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState('');

  const [showIntervention, setShowIntervention] = useState(false);
  const [interventionType, setInterventionType] = useState('photoprotection');
  const [interventionLabel, setInterventionLabel] = useState('');
  const [interventionDate, setInterventionDate] = useState(todayIsoDate());
  const [interventionNote, setInterventionNote] = useState('');
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [interventionMessage, setInterventionMessage] = useState('');

  const completeFiles = VISIBLE_AGING_PHOTO_PROTOCOL_V1.poses.every((pose) => files[pose] instanceof File);
  const acquisitionSummary = useMemo(() => {
    if (!sessions.length) return 'Sin línea base visual';
    if (sessions.length === 1) return 'Línea base creada';
    return `${sessions.length} campañas comparables`;
  }, [sessions.length]);

  async function submitCampaign() {
    if (!completeFiles) return;
    setSavingCampaign(true);
    setCampaignMessage('');
    try {
      await savePhotoCampaign(files as Record<VisibleAgingPose, File>);
      setFiles({});
      setShowCampaign(false);
      setCampaignMessage('Campaña guardada. No se requiere ninguna otra acción.');
    } catch (e: any) {
      setCampaignMessage(e?.message ?? 'No se pudo guardar la campaña.');
    } finally {
      setSavingCampaign(false);
    }
  }

  async function submitIntervention() {
    if (!interventionLabel.trim()) return;
    setSavingIntervention(true);
    setInterventionMessage('');
    try {
      await saveIntervention({
        interventionType,
        label: interventionLabel,
        startedOn: interventionDate,
        note: interventionNote,
      });
      setInterventionLabel('');
      setInterventionNote('');
      setShowIntervention(false);
      setInterventionMessage('Intervención registrada una sola vez.');
    } catch (e: any) {
      setInterventionMessage(e?.message ?? 'No se pudo registrar la intervención.');
    } finally {
      setSavingIntervention(false);
    }
  }

  return <div className="visibleAging">
    <section className="visibleAgingHero">
      <article className="card visibleAgingHeroPrimary">
        <div className="visibleAgingKicker">VISIBLE AGING</div>
        <div className="visibleAgingHeroRow">
          <div>
            <h2>Trayectoria visible, no “edad facial”.</h2>
            <p>HealthOS separa apariencia externa y Aging fisiológico. La comparación principal es contigo mismo y a lo largo del tiempo.</p>
          </div>
          <div className="visibleAgingNoScore"><span>Índice visible</span><strong>—</strong><small>No publicado</small></div>
        </div>
        <div className="visibleAgingPrinciples">
          <span><ShieldCheck size={15}/>Sin score de belleza</span>
          <span><Camera size={15}/>Imagen estandarizada</span>
          <span><Clock3 size={15}/>1 acción cada ~8 semanas</span>
        </div>
      </article>

      <article className={`card visibleAgingActionCard ${campaignDue ? 'due' : 'quiet'}`}>
        <div className="visibleAgingKicker">CARGA DEL USUARIO</div>
        {scope?.isSelf ? campaignDue ? <>
          <strong>~90 segundos pendientes</strong>
          <p>Una campaña visual: frontal, 45° y perfil. Sin cuestionario.</p>
          <button className="primary compactButton" onClick={() => setShowCampaign(true)}><Camera size={16}/>Iniciar campaña</button>
        </> : <>
          <strong>Sin acción hoy</strong>
          <p>Próxima campaña aproximada: {formatDate(nextCampaignDate)}{daysUntilCampaign > 0 ? ` · ${daysUntilCampaign} días` : ''}.</p>
          <button className="secondary compactButton" onClick={() => setShowCampaign(true)}><Camera size={16}/>Registrar antes</button>
        </> : <>
          <strong>Sin acción administrativa</strong>
          <p>Las campañas visuales las realiza el propio usuario.</p>
        </>}
      </article>
    </section>

    {error && <div className="syncError">{error}</div>}
    {campaignMessage && <div className="visibleAgingInlineMessage">{campaignMessage}</div>}

    {showCampaign && scope?.isSelf && <section className="card visibleAgingCampaign">
      <div className="visibleAgingSectionHead">
        <div><div className="visibleAgingKicker">CAMPAÑA VISUAL · V1</div><h3>Tres fotos. Nada más.</h3><p>Mantén luz, distancia y expresión tan parecidas como puedas. HealthOS conserva el protocolo junto a cada sesión.</p></div>
        <button className="textButton" onClick={() => setShowCampaign(false)}>Cerrar</button>
      </div>
      <div className="visibleAgingProtocol">
        {VISIBLE_AGING_PHOTO_PROTOCOL_V1.instructions.map((instruction, index) => <span key={instruction}><b>{index + 1}</b>{instruction}</span>)}
      </div>
      <div className="visibleAgingPoseGrid">
        {VISIBLE_AGING_PHOTO_PROTOCOL_V1.poses.map((pose) => <label className={`visibleAgingPose ${files[pose] ? 'ready' : ''}`} key={pose}>
          <div className="visibleAgingPoseIcon">{files[pose] ? <Check size={18}/> : <Camera size={18}/>}</div>
          <strong>{POSE_LABEL[pose]}</strong>
          <small>{files[pose]?.name ?? 'Añadir foto'}</small>
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setFiles((current) => ({ ...current, [pose]: file }));
          }}/>
        </label>)}
      </div>
      <div className="visibleAgingCampaignFooter">
        <span>Las imágenes son privadas y se usan como serie longitudinal. No se convierten automáticamente en diagnóstico ni edad biológica.</span>
        <button className="primary" disabled={!completeFiles || savingCampaign} onClick={submitCampaign}>{savingCampaign ? 'Guardando…' : 'Guardar campaña'}</button>
      </div>
    </section>}

    <section className="visibleAgingDomains">
      <div className="visibleAgingSectionHead"><div><div className="visibleAgingKicker">EXPRESIÓN EXTERNA</div><h3>Qué puede seguir HealthOS</h3></div><span>{acquisitionSummary}</span></div>
      <div className="visibleAgingDomainGrid">
        {domains.map((domain) => {
          const Icon = DOMAIN_ICON[domain.key];
          return <article className="card visibleAgingDomain" key={domain.key}>
            <div className="visibleAgingDomainTop"><div className="visibleAgingDomainIcon"><Icon size={18}/></div><span className={`visibleAgingState ${domain.acquisition}`}>{domain.acquisition === 'trajectory' ? 'trayectoria' : domain.acquisition === 'baseline' ? 'línea base' : 'sin señal'}</span></div>
            <h4>{domain.label}</h4><strong>{domain.evidenceLabel}</strong><p>{domain.note}</p>
          </article>;
        })}
      </div>
    </section>

    <section className="visibleAgingContextGrid">
      <article className="card visibleAgingContext">
        <div className="visibleAgingKicker">CONTEXTO PASIVO</div><h3>HealthOS observa sin preguntarte</h3>
        <p>Estas señales no explican por sí solas la apariencia. Se conservan como contexto para futuras asociaciones personales.</p>
        <div className="visibleAgingSignalGrid">
          <div><HeartPulse size={16}/><span>HRV</span><strong>{valueLabel(passive.hrv)}</strong></div>
          <div><Activity size={16}/><span>FC reposo</span><strong>{valueLabel(passive.restingHr)}</strong></div>
          <div><Moon size={16}/><span>Sueño</span><strong>{valueLabel(passive.sleep, 'sleep')}</strong></div>
          <div><Scale size={16}/><span>Peso</span><strong>{passive.weightKg == null ? '—' : `${passive.weightKg.toFixed(1)} kg`}</strong></div>
        </div>
        <div className="visibleAgingContextFooter"><span>Cobertura fisiológica reciente</span><strong>{Math.round(passive.overallCoverage * 100)}%</strong></div>
      </article>

      <article className="card visibleAgingInterventions">
        <div className="visibleAgingSectionHead"><div><div className="visibleAgingKicker">INTERVENCIONES</div><h3>Registrar una vez, aprender después</h3></div>{scope?.isSelf && <button className="secondary compactButton" onClick={() => setShowIntervention((x) => !x)}><Plus size={15}/>Añadir</button>}</div>
        {showIntervention && scope?.isSelf && <div className="visibleAgingInterventionForm">
          <select value={interventionType} onChange={(e) => setInterventionType(e.target.value)}>{VISIBLE_AGING_INTERVENTION_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
          <input value={interventionLabel} onChange={(e) => setInterventionLabel(e.target.value)} placeholder="Ej. retinol 0,3% por la noche"/>
          <input type="date" value={interventionDate} onChange={(e) => setInterventionDate(e.target.value)}/>
          <input value={interventionNote} onChange={(e) => setInterventionNote(e.target.value)} placeholder="Nota opcional"/>
          <button className="primary" disabled={!interventionLabel.trim() || savingIntervention} onClick={submitIntervention}>{savingIntervention ? 'Guardando…' : 'Registrar'}</button>
        </div>}
        {interventionMessage && <div className="visibleAgingInlineMessage">{interventionMessage}</div>}
        <div className="visibleAgingInterventionList">
          {interventions.length ? interventions.slice(0, 6).map((item) => <div className="visibleAgingInterventionRow" key={item.id}><span>{formatDate(item.startedOn)}</span><div><strong>{item.label}</strong><small>{item.interventionType.replaceAll('_', ' ')}</small></div></div>) : <div className="visibleAgingEmpty">No hay intervenciones registradas. No es necesario registrar hábitos cotidianos.</div>}
        </div>
      </article>
    </section>

    <section className="card visibleAgingMethod">
      <div><div className="visibleAgingKicker">FRONTERA EPISTÉMICA</div><h3>Qué no hace todavía Visible Aging</h3></div>
      <div className="visibleAgingMethodRules"><span>No estima atractivo.</span><span>No publica edad facial.</span><span>No atribuye causalidad a una intervención por coincidencia temporal.</span><span>Las métricas de imagen futuras exigirán método versionado y reproducible.</span></div>
    </section>

    {loading && <div className="visibleAgingLoading">Actualizando Visible Aging…</div>}
  </div>;
}
