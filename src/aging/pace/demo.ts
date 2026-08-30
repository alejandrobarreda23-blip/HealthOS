import{calculateExperimentalPace}from'./engine';import type{PaceSystemInput}from'./types';
export const paceDemoInputs:PaceSystemInput[]=[
 {systemKey:'cardiovascular',domain:'cardiovascular',signal:.18,confidence:.84,coverage:.86,daysObserved:430,evidenceWeight:.90},
 {systemKey:'fitness',domain:'fitness',signal:.24,confidence:.82,coverage:.78,daysObserved:430,evidenceWeight:.95},
 {systemKey:'sleep_recovery',domain:'sleep',signal:.09,confidence:.88,coverage:.91,daysObserved:410,evidenceWeight:.72},
 {systemKey:'metabolic',domain:'metabolic',signal:.08,confidence:.75,coverage:.73,daysObserved:390,evidenceWeight:.80},
 {systemKey:'body_composition',domain:'body',signal:.04,confidence:.68,coverage:.82,daysObserved:430,evidenceWeight:.55},
 {systemKey:'inflammation',domain:'inflammation',signal:null,confidence:.40,coverage:.25,daysObserved:180,evidenceWeight:.78},
 {systemKey:'renal',domain:'renal',signal:null,confidence:.40,coverage:.30,daysObserved:180,evidenceWeight:.70}
];
export const paceDemo=()=>calculateExperimentalPace(paceDemoInputs);
