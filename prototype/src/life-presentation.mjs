// Presentation reads public server snapshots; it never rolls or settles a life.
export function savedDie(route,body,life){
  if(route!=='life/action')return null;
  const value=body.action==='roll'?life.roll?.dice:body.action==='reroll'?life.roll?.reroll:body.action==='swan'?life.swan?.dice:null;
  return Number.isInteger(value)&&value>=1&&value<=100?value:null;
}
export function pageKey({life,screen}){
  return [life?.id||'',screen,life?.round,life?.phase,!!life?.pending,life?.awards?.[0]?.name||''].join(':');
}
export function tableCards(life){return (life?.cards||[]).slice(0,7).map(card=>({...card,key:'self:'+card.name}));}
export function lastSavedDie(life){
  if(!life)return null;
  const value=life.swan?.dice??life.roll?.reroll??life.roll?.dice??(life.phase==='free-result'?life.lastResult?.dice:null);
  return Number.isInteger(value)&&value>=1&&value<=100?value:null;
}
export function diceAction(root){
  return [...root.querySelectorAll('[data-action="roll"],[data-action="swan"]')].find(button=>!button.disabled)||null;
}
