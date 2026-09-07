import type{ManualMeasurementContext}from'./types';
export function localMeasurementContext(date=new Date()):ManualMeasurementContext{
 const pad=(n:number)=>String(n).padStart(2,'0');
 const physiologicalDate=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
 return{measuredAt:date.toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',utcOffsetMinutes:-date.getTimezoneOffset(),physiologicalDate};
}
