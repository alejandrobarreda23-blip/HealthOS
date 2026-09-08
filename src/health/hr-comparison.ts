import type {TrainingSession} from '../repositories/activities';
import {hrNumber,hrPeers} from './heart-rate';
import {sessionSeconds,numberLabel} from './activities';
export type HrPeer=ReturnType<typeof hrPeers>[number];
export function externalWork(source:Record<string,unknown>|undefined,mode:'power'|'speed'){
  return mode==='power'?(source?.device_watts===true&&source.icu_ignore_power!==true?hrNumber(source.icu_average_watts,1,3000):null):source?.ignore_pace===true||source?.ignore_velocity===true?null:hrNumber(source?.average_speed,.1,60);
}
export function cardiacComparison(session:TrainingSession,source:Record<string,unknown>|null,peer:HrPeer,mode:'power'|'speed'){
  const current=externalWork(source??undefined,mode),hr=hrNumber(session.avg_heart_rate_bpm,25,250),delta=hr===null?null:hr-peer.hr;
  const percent=current===null?null:(current/peer.value-1)*100;
  const fmt=(n:number)=>Math.abs(n).toLocaleString('es-ES',{maximumFractionDigits:1});
  const label=mode==='power'?'potencia media':'velocidad media';
  const currentValue=current===null?'Sin dato':numberLabel(mode==='power'?current:current*3.6,mode==='power'?'W':'km/h');
  const otherValue=numberLabel(mode==='power'?peer.value:peer.value*3.6,mode==='power'?'W':'km/h');
  const direction=delta===null?'Sin comparación de FC':Math.abs(delta)<.05?'FC media prácticamente igual':`FC media ${fmt(delta)} bpm ${delta<0?'menor':'mayor'}`;
  const work=percent===null?'Falta el trabajo externo de esta sesión.':`La ${label} es ${currentValue}, frente a ${otherValue} (${Math.abs(percent)<.05?'sin diferencia al redondear':`${fmt(percent)} % ${percent<0?'menos':'más'}`}).`;
  const interpretation=delta===null?'Falta una FC media válida para interpretar la diferencia.':delta<-.05?'Observamos una respuesta cardíaca media menor en esta salida. Es una señal que merece seguirse en sesiones repetidas y comparables; por sí sola no confirma una mejora del rendimiento.':delta>.05?'Observamos una respuesta cardíaca media mayor en esta salida. No indica por sí sola pérdida de forma: primero hay que revisar cuánto cambió el trabajo y las condiciones.':'Las medias de FC son parecidas. Esto no demuestra que las curvas, los intervalos o la exigencia fueran iguales.';
  const pause=(s:Record<string,unknown>|null|undefined)=>{const elapsed=hrNumber(s?.elapsed_time,1),moving=hrNumber(s?.moving_time);return elapsed!==null&&moving!==null&&moving<=elapsed?(elapsed-moving)/elapsed*100:null;};
  const aPause=pause(source),bPause=pause(peer.source);
  const sameDevice=typeof source?.device_name==='string'&&Boolean(source.device_name.trim())&&source.device_name===peer.source?.device_name;
  const sameRoute=source?.route_id!==null&&source?.route_id!==undefined&&String(source.route_id)!==''&&String(source.route_id)!=='0'&&String(source.route_id)===String(peer.source?.route_id);
  return {delta,percent,direction,work,interpretation,current,currentValue,otherValue,sameDevice,sameRoute,aPause,bPause,
    rows:[{label:'Duración registrada',a:sessionSeconds(session),b:sessionSeconds(peer.session),unit:'min',divisor:60},{label:'Desnivel positivo',a:hrNumber(session.elevation_gain_m),b:hrNumber(peer.session.elevation_gain_m),unit:'m',divisor:1},{label:'Tiempo fuera de movimiento',a:aPause,b:bPause,unit:'%',divisor:1},{label:'Temperatura media de origen',a:typeof source?.average_temp==='number'?source.average_temp:null,b:typeof peer.source?.average_temp==='number'?peer.source.average_temp:null,unit:'°C',divisor:1}]};
}
