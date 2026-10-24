import english from './locales/en.mjs';

export const languages=['zh-CN','en'];
export const normalizeLocale=value=>languages.includes(value)?value:'zh-CN';
export const chineseDecorations={
  'The Archive of Life':'人生档案馆','SEVEN CHAPTERS · ONE LIFE':'七章 · 一生',
  'A Chronicle of Seven Chapters':'人生七章','THE ARCHIVE OF UNWRITTEN LIVES · VOL. VII':'未完的人生档案 · 第七卷',
  'CHAPTER Ⅰ / AGE SEVEN':'第一章 · 七岁','RELATIONS':'人生关系','ARCHIVE NOTES':'人生手记',
  'A MOMENT TO DECIDE':'抉择时刻','WHAT YOU KEEP':'此生所留','01 / THE FATE YOU INHERIT':'01 / 命运的来信',
  'YOUR CHOICE · 此刻由你决定':'此刻由你决定','02 / WHAT YOU DARE TO WRITE':'02 / 由你书写',
  'COMPANIONS · 邀请至多两位正式同行者':'邀请至多两位正式同行者','ELEMENTS IN PLAY · 选择至多两张关键元素':'选择至多两张关键元素',
  'THE DRAW OF FATE':'骰子落定','A PAGE WRITTEN':'往事已成','03 / THE HAND OF CHANCE':'03 / 命运的意外',
  'THE CHAPTER CONTINUES':'人生仍在继续','THE SEVEN CHAPTERS':'人生七章','a page of your life':'此生的一页',
  'THE END / A LIFE IN SEVEN CHAPTERS':'终章 · 一生七章','THE ARCHIVE OF LIFE · VOL VII':'人生档案 · 第七卷',
  'VII CHAPTERS · ONE LIFE':'七章 · 一生','YOUR LIFE · SEVEN CHAPTERS':'你的人生 · 七章',
  'FINIS':'终','YOUR LIFE ARCHIVE':'你的人生档案','PEOPLE ALONG THE WAY':'一路同行的人',
  'LIFE ELEMENT /':'人生元素 /','OPPORTUNITIES & COLLECTION':'机遇与典藏','A SHARED LIFE':'共同生活',
  'THE RULES OF A SINGLE LIFE':'单人人生规则','VII·LIFE':'七章·人生','LIFE ACHIEVEMENT':'人生典藏',
  'AWAKENED':'元素精进','LIFE ELEMENT':'人生元素','UNWRITTEN':'尚未书写',
  'EX LIBRIS • VITAE':'此生藏书','NO. 07 · THE UNWRITTEN':'第七卷 · 未完待续',
  'POSSIBILITY':'可能性','FATE':'命运','TIME':'时间','CHAPTER':'章节','DESTINY':'命运','FORTUNA':'命运','THE BLACK SWAN':'黑天鹅',
};
const escapePattern=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const enKeys=Object.keys(english).sort((a,b)=>b.length-a.length);
const enPattern=new RegExp(enKeys.map(escapePattern).join('|'),'gu');
const zhKeys=Object.keys(chineseDecorations).sort((a,b)=>b.length-a.length);
const zhPattern=new RegExp(zhKeys.map(escapePattern).join('|'),'g');
export function translateText(value,locale='zh-CN',overrides={}){
  let text=String(value??'');
  if(Object.hasOwn(overrides,text))return overrides[text];
  for(const source of Object.keys(overrides).sort((a,b)=>b.length-a.length))if(source&&text.includes(source))text=text.replaceAll(source,overrides[source]);
  if(locale!=='en')return text.replace(zhPattern,key=>chineseDecorations[key]);
  text=text.replace(/CHAPTER ([ⅠⅡⅢⅣⅤⅥⅦ]+) · 第(\d+)回合/g,'CHAPTER $1 · ROUND $2')
    .replace(/进度已自动保存 · 第 (\d+) 笔/g,'Autosaved · Revision $1')
    .replace(/健康剩余 (\d+) 次/g,'Health charges left: $1')
    .replace(/最终留下 (\d+) \/ 7 种元素/g,'Final elements: $1 / 7');
  if(Object.hasOwn(english,text.trim()))return text.replace(text.trim(),english[text.trim()]);
  return text.replace(enPattern,key=>' '+english[key]+' ')
    .replace(/[，、]/g,', ').replace(/。/g,'. ').replace(/：/g,': ').replace(/；/g,'; ').replace(/！/g,'! ').replace(/？/g,'? ')
    .replace(/（/g,' (').replace(/）/g,') ').replace(/／/g,'/').replace(/[ \t]+/g,' ').replace(/\s+([,.!?;:%])/g,'$1').trim();
}
export function localizeDOM(root,locale,overrides={}){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    if(node.parentElement?.closest('script,style,textarea,[data-player-text]'))continue;
    // An option without an explicit value must retain its canonical rule value.
    const option=node.parentElement?.closest('option');if(option&&!option.hasAttribute('value'))option.value=option.textContent;
    node.textContent=translateText(node.textContent,locale,overrides);
  }
  for(const element of root.querySelectorAll('[title],[placeholder],[aria-label]')){
    for(const attr of ['title','placeholder','aria-label'])if(element.hasAttribute(attr))element.setAttribute(attr,translateText(element.getAttribute(attr),locale,overrides));
  }
}
