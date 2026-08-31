import{useAcquisition}from'../hooks/useAcquisition';

const labels={
 missing:'Sin datos',stale:'Desactualizado',below_density:'Cobertura baja',adequate:'Adecuado',observed_no_cadence:'Observado'
}as const;

export default function AcquisitionOpportunities(){
 const{data,loading,error,refresh}=useAcquisition();
 return <section>
  <div className="sectionTitle">Cobertura y próximas mediciones</div>
  <p className="muted acquisitionIntro">HealthOS prioriza huecos de información. No son indicaciones médicas: una prueba clínica o analítica requiere contexto profesional.</p>
  {loading&&<div className="card muted">Calculando cobertura…</div>}
  {error&&<div className="card syncError">No se pudo calcular la cobertura. <button onClick={refresh}>Reintentar</button></div>}
  {!loading&&!error&&data&&data.opportunities.length===0&&<div className="card muted">No hay huecos prioritarios definidos por el contrato actual.</div>}
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
