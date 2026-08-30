export interface ExperimentTemplate{
 exposureKey:string;
 preferredDesign:'randomized_days'|'paired_blocks'|'abab';
 primaryOutcome:string;
 secondaryOutcomes:string[];
 effectWindow:string;
 washoutHours:number;
 confounders:string[];
 minimumPairs:number;
 defaultWeeks:number;
 safetyClass:'low_risk'|'needs_review'|'do_not_autodesign';
 notes:string[];
}

export const EXPERIMENT_TEMPLATES:Record<string,ExperimentTemplate>={
 sauna:{
  exposureKey:'sauna',preferredDesign:'randomized_days',
  primaryOutcome:'hrv_rmssd',
  secondaryOutcomes:['resting_hr','sleep_duration','sleep_efficiency','subjective_energy'],
  effectWindow:'overnight',washoutHours:24,
  confounders:['training_load','alcohol','illness','sleep_debt','altitude'],
  minimumPairs:8,defaultWeeks:4,safetyClass:'needs_review',
  notes:['Do not auto-prescribe temperature or duration.','Exclude illness/dehydration days.']
 },
 late_dinner:{
  exposureKey:'late_dinner',preferredDesign:'paired_blocks',
  primaryOutcome:'hrv_rmssd',
  secondaryOutcomes:['resting_hr','sleep_latency','sleep_efficiency'],
  effectWindow:'same_night',washoutHours:0,
  confounders:['training_load','alcohol','illness','meal_size','sleep_schedule'],
  minimumPairs:10,defaultWeeks:4,safetyClass:'low_risk',
  notes:['Keep meal composition and approximate calories as stable as practical.']
 },
 meditation:{
  exposureKey:'meditation',preferredDesign:'randomized_days',
  primaryOutcome:'subjective_stress',
  secondaryOutcomes:['hrv_rmssd','sleep_latency','subjective_energy'],
  effectWindow:'acute_0_3h_and_overnight',washoutHours:0,
  confounders:['training_load','caffeine','illness','sleep_debt'],
  minimumPairs:10,defaultWeeks:4,safetyClass:'low_risk',
  notes:['Keep session duration approximately stable.']
 },
 alcohol:{
  exposureKey:'alcohol',preferredDesign:'paired_blocks',
  primaryOutcome:'hrv_rmssd',
  secondaryOutcomes:['resting_hr','sleep_efficiency','sleep_duration'],
  effectWindow:'overnight',washoutHours:24,
  confounders:['training_load','illness','sleep_schedule'],
  minimumPairs:8,defaultWeeks:4,safetyClass:'do_not_autodesign',
  notes:['Health OS must not recommend alcohol exposure as an intervention.']
 }
};
