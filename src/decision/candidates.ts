import type{Opportunity}from'../learning/opportunities';
import type{ExperimentProtocol}from'../experiments/types';
import type{PaceResult}from'../aging/pace/types';
import type{DecisionCandidate}from'./types';

export function fromOpportunity(o:Opportunity):DecisionCandidate{
 const supported=o.evidenceLevel==='strong'||o.evidenceLevel==='experiment_supported';
 return{
  key:`behavior:${o.key}`,kind:'behavior',
  title:`${o.action==='reduce'?'Reducir':o.action==='increase'?'Potenciar':o.action==='maintain'?'Mantener':'Observar'} ${o.exposureKey.replaceAll('_',' ')}`,
  action:o.action,systems:o.systems,
  expectedBenefit:supported?Math.min(1,.45+o.score):Math.min(.65,o.score+.15),
  informationGain:o.evidenceLevel==='exploratory'?.35:.12,
  evidenceConfidence:o.confidence,actionability:.88,burden:.20,
  uncertainty:1-o.confidence,safetyPenalty:0,
  sourceRefs:[`personal_opportunity:${o.key}`],rationale:[o.reason]
 };
}

export function fromExperiment(p:ExperimentProtocol):DecisionCandidate{
 return{
  key:`experiment:${p.exposureKey}`,kind:'experiment',
  title:`Probar: ${p.exposureKey.replaceAll('_',' ')}`,
  action:`Ejecutar protocolo ${p.designKind} con ${p.minimumPairs} pares mínimos`,
  systems:[],
  expectedBenefit:.18,informationGain:.92,
  evidenceConfidence:p.protocolConfidence,actionability:.70,burden:.42,
  uncertainty:.75,safetyPenalty:0,
  sourceRefs:[`experiment_protocol:${p.exposureKey}`],
  rationale:[...p.rationale,`Outcome primario: ${p.primaryOutcome}`]
 };
}

export function fromPaceCoverage(p:PaceResult):DecisionCandidate[]{
 const xs:DecisionCandidate[]=[];
 if(p.coverage<.75)xs.push({
  key:'data:pace-coverage',kind:'data_quality',title:'Mejorar cobertura longitudinal',
  action:'Cerrar los huecos de datos que limitan la confianza del Health OS Pace.',
  systems:p.systemsUsed,expectedBenefit:.08,informationGain:.78,evidenceConfidence:1,
  actionability:.75,burden:.18,uncertainty:1-p.coverage,safetyPenalty:0,
  sourceRefs:['pace:coverage'],rationale:[`Cobertura actual ${Math.round(p.coverage*100)}%.`]
 });
 if(p.systemsExcluded && Object.keys(p.systemsExcluded).some(k=>!k.startsWith('_')))xs.push({
  key:'measure:excluded-systems',kind:'measure',title:'Completar sistemas ciegos',
  action:'Priorizar mediciones que permitan incorporar sistemas actualmente excluidos.',
  systems:Object.keys(p.systemsExcluded).filter(k=>!k.startsWith('_')),
  expectedBenefit:.10,informationGain:.85,evidenceConfidence:.95,actionability:.60,burden:.28,
  uncertainty:.85,safetyPenalty:0,sourceRefs:['pace:systems_excluded'],
  rationale:['Un sistema sin señal no debe tratarse como si estuviera sano ni enfermo.']
 });
 return xs;
}
