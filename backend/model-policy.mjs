// Provider settings are server-only. Complexity is a task decision, not a client override.
export function modelPolicy(env,task='simple'){
  const complex=['memoir','plan-repair'].includes(task);
  const model=(complex?env.MINIMAX_COMPLEX_MODEL:null)||env.MINIMAX_MODEL||'MiniMax-M3';
  if(model.startsWith('MiniMax-M3.1-Flash')){
    const requested=env.MINIMAX_COMPLEX_EFFORT||'medium';
    const effort=['low','medium','high'].includes(requested)?requested:'medium';
    return {model,thinking:{type:'adaptive'},reasoning_effort:effort,timeoutMs:90000};
  }
  return {model,thinking:{type:'disabled'},timeoutMs:55000};
}
