import type{ExperimentCandidate,ExperimentProtocol}from'./types';
import{EXPERIMENT_TEMPLATES}from'./catalog';

function seededOrder(n:number,seed:string){
 let x=2166136261;
 for(const c of seed)x=(x^c.charCodeAt(0))*16777619>>>0;
 const out:Array<'exposure'|'control'>=[];
 let e=0,c=0;
 for(let i=0;i<n;i++){
  x=(1664525*x+1013904223)>>>0;
  let arm:(typeof out)[number]=(x%2===0?'exposure':'control');
  if(e-c>=2)arm='control';
  if(c-e>=2)arm='exposure';
  out.push(arm);arm==='exposure'?e++:c++;
 }
 return out;
}

export function designExperiment(candidate:ExperimentCandidate,seed='healthos'):ExperimentProtocol|null{
 const t=EXPERIMENT_TEMPLATES[candidate.exposureKey];
 if(!t)return null;
 if(candidate.safetyClass==='do_not_autodesign'||t.safetyClass==='do_not_autodesign')return null;
 if(!candidate.reversible)return null;

 const weeks=Math.max(t.defaultWeeks,Math.ceil(t.minimumPairs*2/7));
 const totalDays=weeks*7;
 const arms=seededOrder(totalDays,seed+candidate.exposureKey);
 const schedule=arms.map((arm,i)=>({day:i+1,arm}));

 const exposureDays=schedule.filter(x=>x.arm==='exposure').length;
 const controlDays=schedule.filter(x=>x.arm==='control').length;

 return{
  title:`¿Cómo afecta ${candidate.exposureKey.replaceAll('_',' ')} a ${t.primaryOutcome}?`,
  exposureKey:candidate.exposureKey,
  designKind:t.preferredDesign,
  primaryOutcome:t.primaryOutcome,
  secondaryOutcomes:t.secondaryOutcomes,
  effectWindow:t.effectWindow,
  plannedExposureDays:exposureDays,
  plannedControlDays:controlDays,
  minimumPairs:t.minimumPairs,
  washoutHours:t.washoutHours,
  confoundersToTrack:[...new Set([...t.confounders,...candidate.confounders])],
  inclusionRules:{usual_routine:true,device_continuity:true},
  exclusionRules:{acute_illness:true,major_travel:true,device_change:true},
  stoppingRules:{
    user_can_stop_any_time:true,
    stop_on_adverse_symptoms:true,
    minimum_adherence:.70
  },
  expectedDirection:candidate.expectedDirection,
  protocolConfidence:candidate.currentEvidence==='moderate'?.78:
                     candidate.currentEvidence==='exploratory'?.66:.55,
  schedule,
  rationale:[
    'Prospective assignment reduces some bias versus passive observation.',
    `Primary outcome fixed in advance: ${t.primaryOutcome}.`,
    `Minimum paired evidence target: ${t.minimumPairs}.`,
    'The protocol does not alter the observed Health OS Pace directly.'
  ],
  protocolVersion:'n-of-1-designer-v1'
 };
}
