import{describe,it,expect}from'vitest';import{decisionScore}from'../src/decision/scoring';import{rankDecisions}from'../src/decision/ranker';import type{DecisionCandidate}from'../src/decision/types';
const c=(x:Partial<DecisionCandidate>):DecisionCandidate=>({key:'x',kind:'behavior',title:'x',action:'x',systems:['sleep'],expectedBenefit:.5,informationGain:.5,evidenceConfidence:.7,actionability:.8,burden:.2,uncertainty:.3,safetyPenalty:0,sourceRefs:[],rationale:[],...x});
describe('Decision Engine',()=>{
 it('rewards information gain',()=>{expect(decisionScore(c({informationGain:.9}))).toBeGreaterThan(decisionScore(c({informationGain:.1})))});
 it('penalizes burden',()=>{expect(decisionScore(c({burden:.1}))).toBeGreaterThan(decisionScore(c({burden:.9})))});
 it('penalizes safety concerns strongly',()=>{expect(decisionScore(c({safetyPenalty:0}))).toBeGreaterThan(decisionScore(c({safetyPenalty:.9})))});
 it('returns a compact ranked queue',()=>{const xs=[c({key:'a'}),c({key:'b',systems:['fitness']}),c({key:'c',systems:['metabolic']}),c({key:'d',systems:['renal']})];expect(rankDecisions(xs).length).toBe(3)});
});
