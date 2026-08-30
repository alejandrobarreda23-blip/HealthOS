export type WindowDef={key:string;hours?:number;days?:number;anchor?:'sleep'};
export type EventDefinition={eventType:string;displayName:string;domain:string;windows:WindowDef[];outcomes:string[];confounders:string[]};

export const EVENT_DEFINITIONS:Record<string,EventDefinition>={
 sauna:{eventType:'sauna',displayName:'Sauna',domain:'recovery',windows:[{key:'acute_0_6h',hours:6},{key:'overnight',anchor:'sleep'},{key:'next_day',hours:24}],outcomes:['hrv_rmssd','resting_hr','sleep_duration','sleep_efficiency','subjective_energy'],confounders:['training_load','alcohol','illness','sleep_debt','altitude']},
 meditation:{eventType:'meditation',displayName:'Meditación',domain:'recovery',windows:[{key:'acute_0_3h',hours:3},{key:'overnight',anchor:'sleep'}],outcomes:['hrv_rmssd','resting_hr','sleep_latency','subjective_stress'],confounders:['training_load','alcohol','illness','caffeine','sleep_debt']},
 late_dinner:{eventType:'late_dinner',displayName:'Cena tardía',domain:'nutrition',windows:[{key:'same_night',anchor:'sleep'},{key:'next_morning',hours:12}],outcomes:['hrv_rmssd','resting_hr','sleep_latency','sleep_efficiency','glucose'],confounders:['alcohol','training_load','illness','meal_size','bedtime']}
};
