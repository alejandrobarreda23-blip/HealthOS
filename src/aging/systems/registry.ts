import type{SystemDefinition}from'./types';

export const SYSTEMS:SystemDefinition[]=[
 {key:'cardiovascular',label:'Cardiovascular',minimumDays:90,minimumMetrics:2,required:['resting_hr','systolic_bp'],optional:['diastolic_bp','hrv_rmssd','pulse_pressure','vo2max']},
 {key:'metabolic',label:'Metabólico',minimumDays:120,minimumMetrics:1,required:['glucose_fasting'],optional:['hba1c','triglycerides','hdl','ldl','apob','insulin_fasting','waist_cm','weight']},
 {key:'fitness',label:'Fitness',minimumDays:90,minimumMetrics:1,required:['vo2max'],optional:['threshold_hr','training_load','weekly_zone2_minutes','strength_sessions','pace_at_submax_hr']},
 {key:'sleep_recovery',label:'Sueño y recuperación',minimumDays:60,minimumMetrics:2,required:['sleep_duration','hrv_rmssd'],optional:['sleep_efficiency','sleep_regularity','resting_hr','sleep_latency','awake_minutes']},
 {key:'body_composition',label:'Composición corporal',minimumDays:90,minimumMetrics:1,required:['weight'],optional:['body_fat_percent','waist_cm','lean_mass_kg','visceral_fat_index']},
 {key:'inflammation',label:'Inflamación',minimumDays:180,minimumMetrics:1,required:['crp'],optional:['wbc','neutrophils','lymphocytes','esr']},
 {key:'renal',label:'Renal',minimumDays:180,minimumMetrics:1,required:['creatinine'],optional:['egfr','cystatin_c','urea','urine_albumin_creatinine_ratio']}
];
