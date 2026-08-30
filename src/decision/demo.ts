import{learningDemo}from'../learning/demo';import{experimentsDemo}from'../experiments/demo';import{paceDemo}from'../aging/pace/demo';import{buildDecisionQueue}from'./engine';
export function decisionDemo(){const l=learningDemo(),e=experimentsDemo(),p=paceDemo();return buildDecisionQueue({opportunities:l.opportunities,protocols:e.protocols as any,pace:p})}
