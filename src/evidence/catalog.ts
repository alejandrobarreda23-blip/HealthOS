import type{MetricEvidence,MeasurementMethod}from'./types';

export const EVIDENCE:Record<string,MetricEvidence>={
 vo2max:{metricKey:'vo2max',systemKey:'fitness',evidenceStrength:'high',evidenceScore:.95,favorableDirection:'higher',relationshipShape:'dose_response',outcomeScope:['all_cause_mortality','cardiovascular_mortality','heart_failure']},
 resting_hr:{metricKey:'resting_hr',systemKey:'cardiovascular',evidenceStrength:'moderate',evidenceScore:.78,favorableDirection:'lower',relationshipShape:'dose_response',outcomeScope:['all_cause_mortality','cardiovascular_mortality']},
 systolic_bp:{metricKey:'systolic_bp',systemKey:'cardiovascular',evidenceStrength:'high',evidenceScore:.92,favorableDirection:'lower',relationshipShape:'risk_gradient',outcomeScope:['cardiovascular_events','stroke']},
 sleep_duration:{metricKey:'sleep_duration',systemKey:'sleep_recovery',evidenceStrength:'moderate',evidenceScore:.68,favorableDirection:'range',relationshipShape:'u_shaped',outcomeScope:['all_cause_mortality']},
 crp:{metricKey:'crp',systemKey:'inflammation',evidenceStrength:'moderate',evidenceScore:.78,favorableDirection:'lower',relationshipShape:'nonlinear_positive',outcomeScope:['all_cause_mortality','cardiovascular_mortality']},
 hba1c:{metricKey:'hba1c',systemKey:'metabolic',evidenceStrength:'moderate',evidenceScore:.76,favorableDirection:'range',relationshipShape:'nonlinear',outcomeScope:['cardiovascular_mortality','all_cause_mortality']},
 creatinine:{metricKey:'creatinine',systemKey:'renal',evidenceStrength:'moderate',evidenceScore:.65,favorableDirection:'contextual',relationshipShape:'contextual',outcomeScope:['kidney_function']},
 weight:{metricKey:'weight',systemKey:'body_composition',evidenceStrength:'low',evidenceScore:.45,favorableDirection:'contextual',relationshipShape:'contextual',outcomeScope:['metabolic_health']}
};

export const METHODS:Record<string,MeasurementMethod>={
 'vo2max:cpet':{metricKey:'vo2max',methodKey:'cpet',grade:'research_grade',reliabilityScore:1,minimumSamples:1},
 'vo2max:wearable_estimate':{metricKey:'vo2max',methodKey:'wearable_estimate',grade:'consumer_estimate',reliabilityScore:.68,minimumSamples:6},
 'resting_hr:wearable_night':{metricKey:'resting_hr',methodKey:'wearable_night',grade:'validated_consumer',reliabilityScore:.88,minimumSamples:7},
 'systolic_bp:validated_cuff':{metricKey:'systolic_bp',methodKey:'validated_cuff',grade:'clinical',reliabilityScore:.96,minimumSamples:6},
 'sleep_duration:wearable':{metricKey:'sleep_duration',methodKey:'wearable',grade:'validated_consumer',reliabilityScore:.75,minimumSamples:14},
 'crp:laboratory':{metricKey:'crp',methodKey:'laboratory',grade:'clinical',reliabilityScore:.98,minimumSamples:2},
 'hba1c:laboratory':{metricKey:'hba1c',methodKey:'laboratory',grade:'clinical',reliabilityScore:.99,minimumSamples:2},
 'creatinine:laboratory':{metricKey:'creatinine',methodKey:'laboratory',grade:'clinical',reliabilityScore:.98,minimumSamples:2},
 'weight:connected_scale':{metricKey:'weight',methodKey:'connected_scale',grade:'validated_consumer',reliabilityScore:.94,minimumSamples:10}
};
