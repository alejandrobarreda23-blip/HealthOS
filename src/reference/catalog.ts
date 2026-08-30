import type{MetricReference}from'./types';

export const REFERENCES:Record<string,MetricReference>={
 systolic_bp:{key:'sbp_adult_context_v1',metricKey:'systolic_bp',kind:'clinical_threshold',unit:'mmHg',quality:.92,version:'ref-v1',curve:{type:'piecewise',points:[[90,.35],[105,.85],[115,1],[120,.9],[130,.45],[140,-.2],[160,-.8],[180,-1]]}},
 sleep_duration:{key:'sleep_duration_adult_v1',metricKey:'sleep_duration',kind:'nonlinear_range',unit:'minutes',quality:.78,version:'ref-v1',curve:{type:'range',optimal:[420,540],soft:[360,600],hard:[300,660]}},
 resting_hr:{key:'resting_hr_personal_v1',metricKey:'resting_hr',kind:'personal_baseline',unit:'bpm',quality:.82,version:'ref-v1',curve:{type:'personal_robust_z',direction:'lower_contextual',max_abs_z:3}},
 hrv_rmssd:{key:'hrv_personal_v1',metricKey:'hrv_rmssd',kind:'personal_baseline',unit:'ms',quality:.82,version:'ref-v1',curve:{type:'personal_robust_z',direction:'higher_contextual',max_abs_z:3}},
 vo2max:{key:'vo2max_age_sex_v1',metricKey:'vo2max',kind:'age_sex_reference',unit:'ml/kg/min',quality:0,version:'ref-v1',curve:{type:'percentile_lookup',dataset:'external_required'}},
 glucose_fasting:{key:'glucose_fasting_adult_v1',metricKey:'glucose_fasting',kind:'clinical_threshold',unit:'mmol/L',quality:.82,version:'ref-v1',curve:{type:'piecewise',points:[[3.5,-.7],[4,.5],[4.6,1],[5.1,.85],[5.6,.35],[6.1,-.25],[7,-.85],[8,-1]]}},
 hba1c:{key:'hba1c_adult_v1',metricKey:'hba1c',kind:'clinical_threshold',unit:'percent',quality:.84,version:'ref-v1',curve:{type:'piecewise',points:[[4,.55],[4.8,1],[5.3,.9],[5.7,.4],[6,0],[6.5,-.7],[8,-1]]}},
 crp:{key:'crp_baseline_v1',metricKey:'crp',kind:'clinical_threshold',unit:'mg/L',quality:.75,version:'ref-v1',curve:{type:'piecewise',points:[[.1,1],[1,.8],[3,.25],[5,-.2],[10,-.7],[20,-1]]}},
 weight:{key:'weight_personal_v1',metricKey:'weight',kind:'contextual',unit:'kg',quality:.5,version:'ref-v1',curve:{type:'context_required'}}
};
