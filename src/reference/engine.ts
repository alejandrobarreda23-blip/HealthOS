import type{MetricReference,ReferenceContext,ReferenceEvaluation}from'./types';
import{clamp,interpolatePiecewise,rangeDesirability,robustZ}from'./math';

function contextPenalty(c:ReferenceContext){
 let p=1;
 if(c.acuteIllness)p*=.55;
 if(c.medicationChange)p*=.75;
 if(c.altitudeChange)p*=.82;
 if(c.deviceChange)p*=.72;
 return p;
}

export function evaluateReference(ref:MetricReference,value:number,ctx:ReferenceContext={}):ReferenceEvaluation{
 const base={metricKey:ref.metricKey,value,unit:ref.unit,referenceKey:ref.key,engineVersion:'risk-reference-v1'};
 let signal:number|null=null,percentile:number|null=ctx.contextualPercentile??null;
 let status:ReferenceEvaluation['status']='ok';
 let explanation='';

 switch(ref.curve.type){
  case'piecewise':
   signal=interpolatePiecewise(value,ref.curve.points);
   explanation='Valor contextualizado mediante una curva de referencia versionada.';
   break;
  case'range':
   signal=rangeDesirability(value,ref.curve.optimal,ref.curve.soft,ref.curve.hard);
   explanation='Se usa una relación no lineal con rango favorable, no “más es mejor”.';
   break;
  case'personal_robust_z':{
   if(ctx.baselineMedian==null||ctx.baselineMad==null){
    status='insufficient_reference';explanation='Falta baseline personal robusto.';break;
   }
   const z=robustZ(value,ctx.baselineMedian,ctx.baselineMad);
   if(z===null){status='insufficient_reference';explanation='MAD insuficiente para normalizar.';break;}
   const signed=ref.curve.direction==='higher_contextual'?z:-z;
   signal=clamp(signed/ref.curve.max_abs_z);
   explanation='Se interpreta contra el baseline personal robusto, no contra una media poblacional.';
   break;
  }
  case'percentile_lookup':
   if(percentile==null){
    status='insufficient_reference';explanation='Falta percentil poblacional compatible con edad/sexo/protocolo.';break;
   }
   signal=clamp((percentile-50)/50);
   explanation='Se contextualiza frente a un percentil poblacional compatible.';
   break;
  case'context_required':
   status='context_required';explanation='La métrica no tiene dirección saludable universal sin contexto.';
   break;
 }
 const confidence=signal===null?0:Math.max(0,Math.min(1,ref.quality*contextPenalty(ctx)));
 return{...base,normalizedSignal:signal===null?null:clamp(signal),desirabilityScore:signal===null?null:clamp(signal),contextualPercentile:percentile,confidence,status,explanation};
}
