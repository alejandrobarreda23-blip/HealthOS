import{median,mad}from'../health/features/robust';

export interface DailyBriefInput{
  date:string;
  hrv42:number[];
  hrv7:number[];
  restingHr42:number[];
  restingHr7:number[];
  sleepMinutes42:number[];
  sleepMinutes7:number[];
  trainingLoadChangePct?:number;
  events?:{type:string;count:number}[];
}
export interface DailyBrief{
  date:string;
  recovery:{
    hrvBaseline:number|null; hrv7:number|null; hrvChangePct:number|null; hrvMad:number|null;
    restingHrBaseline:number|null; restingHr7:number|null;
  };
  sleep:{baselineMinutes:number|null; last7Minutes:number|null; changeMinutes:number|null};
  training:{loadChangePct:number|null};
  events:{type:string;count:number}[];
  quality:{hrvCoverage:number;sleepCoverage:number};
}

function pct(a:number|null,b:number|null){if(a===null||b===null||b===0)return null;return((a-b)/b)*100}

export function buildDailyBrief(i:DailyBriefInput):DailyBrief{
  const hb=median(i.hrv42),h7=median(i.hrv7),rb=median(i.restingHr42),r7=median(i.restingHr7);
  const sb=median(i.sleepMinutes42),s7=median(i.sleepMinutes7);
  return{
    date:i.date,
    recovery:{hrvBaseline:hb,hrv7:h7,hrvChangePct:pct(h7,hb),hrvMad:mad(i.hrv42),restingHrBaseline:rb,restingHr7:r7},
    sleep:{baselineMinutes:sb,last7Minutes:s7,changeMinutes:sb!==null&&s7!==null?s7-sb:null},
    training:{loadChangePct:i.trainingLoadChangePct??null},
    events:i.events??[],
    quality:{hrvCoverage:Math.min(1,i.hrv42.length/42),sleepCoverage:Math.min(1,i.sleepMinutes42.length/42)}
  };
}
