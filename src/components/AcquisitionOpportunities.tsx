import{useAcquisition}from'../hooks/useAcquisition';

const labels={
 missing:'Sin datos',stale:'Desactualizado',below_density:'Cobertura baja',adequate:'Adecuado',observed_no_cadence:'Observado'
}as const;
const prettyProvider=(x:string)=>x.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());
const dateLabel=(x:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(new Date(x));

export default function AcquisitionOpportunities(){
 const{data,loading,error,refresh}=useAcquisition();
 return <section>
  <div className="sectionTitle">Cobertura y próximas mediciones</div>
  <p className="muted acquisitionIntro">HealthOS prioriza huecos de información y separa problemas de adquisición de cambios fisiológicos. No son indicaciones médicas.</p>
  {loading&&<div className="card muted">Calculando cobertura…</div>}
  {error&&<div className="card syncError">No se pudo calcular la cobertura. <button onClick={refresh}>Reintentar</button></div>}
  {!loading&&!error&&data&&data.sourceSignals.length===0&&data.opportunities.length===0&&<div className="card muted">No hay huecos prioritarios definidos por el contrato actual.</div>}
  {!loading&&!error&&data?.sourceSignals.map(x=><div className="card sourceContinuityCard" key={x.provider}>
   <div className="acquisitionTop"><div><strong>Sin datos recientes del wearable</strong><small>{prettyProvider(x.provider)}</small></div><span>Fuente</span></div>
   <p>Último dato compartido: <b>{dateLabel(x.lastObservedAt)}</b>. {x.affectedMetricKeys.length} señales afectadas.</p>
   <div className="sourceMetricList">{x.affectedDisplayNames.map(m=><span key={m}>{m}</span>)}</div>
   <p className="sourceBoundary">Puede deberse a que el dispositivo no se haya usado, a permisos, conexión o sincronización. HealthOS no infiere la causa y no interpreta esta ausencia como fisiología.</p>
  </div>)}
  {!loading&&!error&&data?.opportunities.slice(0,5).map(x=><div className="card acquisitionCard" key={x.metricKey}>
   <div className="acquisitionTop"><div><strong>{x.displayName}</strong><small>{x.domain}</small></div><span>{labels[x.status]}</span></div>
   <p>{x.reason}</p>
   <div className="acquisitionMeta">
    <span>{x.measurementMode.replaceAll('_',' ')}</span>
    {x.protocolId&&<span>Protocolo: {x.protocolId}</span>}
    {x.preferredCadence&&<span>{x.preferredCadence}</span>}
   </div>
  </div>)}
 </section>;
}
