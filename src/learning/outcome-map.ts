import type{OutcomeMap}from'./types';
export const OUTCOME_MAP:OutcomeMap[]=[
 {outcomeKey:'hrv_rmssd',systemKey:'sleep_recovery',direction:'higher_favorable',relevance:.85},
 {outcomeKey:'hrv_rmssd',systemKey:'cardiovascular',direction:'higher_favorable',relevance:.45},
 {outcomeKey:'resting_hr',systemKey:'cardiovascular',direction:'lower_favorable',relevance:.80},
 {outcomeKey:'resting_hr',systemKey:'sleep_recovery',direction:'lower_favorable',relevance:.45},
 {outcomeKey:'sleep_duration',systemKey:'sleep_recovery',direction:'range',relevance:.70},
 {outcomeKey:'sleep_efficiency',systemKey:'sleep_recovery',direction:'higher_favorable',relevance:.80},
 {outcomeKey:'sleep_latency',systemKey:'sleep_recovery',direction:'lower_favorable',relevance:.55},
 {outcomeKey:'subjective_energy',systemKey:'sleep_recovery',direction:'higher_favorable',relevance:.35},
 {outcomeKey:'glucose_fasting',systemKey:'metabolic',direction:'lower_favorable',relevance:.80},
 {outcomeKey:'systolic_bp',systemKey:'cardiovascular',direction:'lower_favorable',relevance:.90},
 {outcomeKey:'vo2max',systemKey:'fitness',direction:'higher_favorable',relevance:.95},
 {outcomeKey:'weight',systemKey:'body_composition',direction:'contextual',relevance:.35},
 {outcomeKey:'crp',systemKey:'inflammation',direction:'lower_favorable',relevance:.80},
];
