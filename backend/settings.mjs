// Candidate balance values, not claims of finalized tabletop rules. Each new
// life stores its own snapshot so a later tuning pass cannot rewrite its rolls.
export const TEST_RULESET={
  version:'solo-1.1-preview',status:'test',
  difficultyTable:{'简单':[65,1],'普通':[45,1],'困难':[25,.8],'极难':[10,.5],'传奇':[5,.25]},
  matchPoints:{'高度匹配':8,'一般匹配':4,'暂不匹配':0},sameNameFactors:[1,.5,.25],
  maxElementContribution:24,teamBonus:3,maxSuccessRate:90,rounding:'nearest-integer',
  maxParticipants:3,cardsPerParticipant:2,lossWeights:{self:3,companion:1},
  swanQuietThrough:65,healthAutomatic:true,healthTierCap:2,adultAge:18,npcSuccessRate:53,
  childChainEnabled:false,
  activeRetentionDays:30,endingRetentionHours:48,
};
export const rulesFor=life=>life?.rulesSnapshot||TEST_RULESET;
