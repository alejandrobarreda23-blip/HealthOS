import{learningDemo}from'../learning/demo';import{experimentCandidates}from'./candidate-engine';import{designExperiment}from'./designer';
export function experimentsDemo(){
 const learning=learningDemo();
 const candidates=experimentCandidates(learning.opportunities);
 const protocols=candidates.map(c=>designExperiment(c,'demo-seed')).filter(Boolean);
 return{candidates,protocols};
}
