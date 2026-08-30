import type{DailyBrief}from'./daily-brief';

export function buildAnalysisContext(question:string,brief:DailyBrief){
  return{
    schema:'health-analysis-context@1',
    question,
    generatedAt:new Date().toISOString(),
    period:{end:brief.date},
    dailyBrief:brief,
    epistemicRules:[
      'observations are not causality',
      'derived values must preserve provenance',
      'uncertainty must be explicit'
    ]
  };
}
