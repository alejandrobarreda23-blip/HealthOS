import{useAcquisition}from'../hooks/useAcquisition';

const prettyProvider=(x:string)=>x.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());
const dateLabel=(x:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(new Date(x));
const tierLabel=(x:1|2|3)=>({1:'Base',2:'Ampliación',3:'Contexto'}as const)[x];
const actionLabel={passive:'Pasivo',self_measurement:'Baja fricción',protocol_ready:'Protocolo',review_only:'Revisión',contextual:'Contextual'}as const;

export default function AcquisitionOpportunities(){
 const{data,loading,error,refresh}=useAcquisition();
 return <section>
  <div className="sectionTitle">Cobertura y próximas mediciones</div>
  <p className="muted acquisitionIntro">HealthOS ordena huecos de información por valor longitudinal, fiabilidad y carga. El orden es de adquisición de datos, no una prioridad médica.</p>
  {loading&&<div className="card muted">Calculando cobertura…</div>}
  {error&&<div className="card syncError">No se pudo calcular la cobertura. <button onClick={refresh}>Reintentar</button></div>}
  {!loading&&!error&&data&&data.sourceSignals.length===0&&data.gapGroups.length===0&&<div className="card muted">No hay huecos prioritarios definidos por el contrato actual.</div>}
  {!loading&&!error&&data?.sourceSignals.map(x=><div className="card sourceContinuityCard" key={x.provider}>
   <div className="acquisitionTop"><div><strong>Sin datos recientes del wearable</strong><small>{prettyProvider(x.provider)}</small></div><span>Fuente</span></div>
   <p>Último dato compartido: <b>{dateLabel(x.lastObservedAt)}</b>. {x.affectedMetricKeys.length} señales afectadas.</p>
   <div className="sourceMetricList">{x.affectedDisplayNames.map(m=><span key={m}>{m}</span>)}</div>
   <p className="sourceBoundary">Puede deberse a que el dispositivo no se haya usado, a permisos, conexión o sincronización. HealthOS no infiere la causa y no interpreta esta ausencia como fisiología.</p>
  </div>)}
  {!loading&&!error&&data&&data.gapGroups.length>0&&<div className="acquisitionGapHeader">
   <strong>Huecos independientes</strong>
   <span>{data.gapGroups.length} {data.gapGroups.length===1?'área':'áreas'} por resolver</span>
  </div>}
  {!loading&&!error&&data?.gapGroups.slice(0,6).map(x=><div className="card acquisitionCard acquisitionGroupCard" key={x.groupKey}>
   <div className="acquisitionTop">
    <div><strong>{x.headline}</strong><small>{x.domains.join(' · ')}</small></div>
    <div className="acquisitionBadges"><span>{tierLabel(x.priorityTier)}</span><span>{actionLabel[x.actionability]}</span></div>
   </div>
   <p>{x.explanation}</p>
   {x.displayNames.length>1&&<div className="sourceMetricList">{x.displayNames.map(m=><span key={m}>{m}</span>)}</div>}
   <p className="acquisitionRationale"><b>Por qué aporta información:</b> {x.rationale}</p>
   <p className="acquisitionNext"><b>Siguiente paso:</b> {x.nextStep}</p>
   <div className="acquisitionMeta">
    {x.protocolId&&<span>Protocolo: {x.protocolId}</span>}
    {x.preferredCadence&&<span>{x.preferredCadence}</span>}
   </div>
  </div>)}
  {!loading&&!error&&data&&<p className="muted acquisitionFooter">HealthOS no interpreta “sin datos” como “anormal” y no crea una cadencia clínica cuando el contrato no la define.</p>}
 </section>;
}
