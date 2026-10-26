import {translateText} from '../../locale.mjs';
const english:Record<string,string>={
 '古典命运桌与可以打开的三维书本':'A candlelit table and an interactive book','选择人生元素，最多两张':'Life elements: select up to two','此生档案':'Life dossier','命运之书':'The Book of Fate','七 章 人 生 · 一 册 珍 藏':'SEVEN CHAPTERS · ONE LIFE',
 '一 部 尚 未 写 完 的 人 生':'A LIFE STILL UNWRITTEN','命运有它的安排。':'Fate has its plans.','你有你的选择。':'You have your choices.',
 '七张人生元素，一本等待落笔的书。':'Seven life elements. A book waiting to be written.','把这一页，交给此刻的你。':'This page belongs to you.',
 '打开命运之书':'Open the Book of Fate','建议打开声音，慢慢体验':'Enable sound and take your time','开启声音':'Enable sound','关闭声音':'Mute sound',
 '查看操作说明':'How to play','操作说明':'How to play','靠近阅读':'Read closer','靠近阅读／返回全景':'Read closer / Return to the table',
 '返回人生游戏':'Original life game','合上此书':'Close the book','所走的路，终会成为你。':'The paths you take become who you are.',
 '单人人生 · 七章一生':'ONE PLAYER · SEVEN CHAPTERS','关于命运之书':'About the Book of Fate','先把一页人生，':'Hold a page of life','握在手中。':'in your hands.',
 '打开书本，从七岁抽卡开始经历七章人生。书页可以滚动阅读；自由事件可选至多两张桌上元素，也可使用书内的配偶资源。司书评估之后，点击桌上骰子锁定行动；黑天鹅也能点击骰子，机遇需在书内明确选择后重掷。其他时候，点击骰子可以端详外观。':'Open the book and begin at age seven. Scroll the pages to read. Select up to two life elements for a free action; spouse resources are available in the book. After assessment, click a die to commit your action. You can also roll a black swan this way. Opportunity rerolls require an explicit choice in the book. At other times, click a die to inspect its appearance.',
 '每次正式推进会翻到下一页。Tab 可依次选择卡牌和按钮，Enter 确认；输入时保留正常键盘操作。':'The book turns as your life progresses. Use Tab to move between controls and Enter to confirm. Text fields retain normal keyboard input.',
 '现已接入原单人游戏的规则、MiniMax司书和存档，与原页面共享这一生。骰点由服务端保存，三维骰子以刚体轨迹呈现同一结果。换卡不重复请求评估，短手记和终局传记逐步显示。尚未开放真人联机、广告或支付；当前仍采用已标注的测试规则。':'This edition shares the original single-player rules, MiniMax narration and saved lives. The server saves every die result, and the physical replay presents that same value. Changing cards does not request another assessment. Notes and the final memoir stream as they are written. Multiplayer, advertising and payments remain unavailable; marked preview rules still apply.',
 '模型署名：':'Model credits:','已压缩、拆分铰接并添加翻页。烛台、怀表、旧书及环境材质来自':'Compressed and adapted with hinges and page turns. Candelabra, watch, books and environment materials by',
 '完整来源记录':'Full asset credits','骰子外观 ◇':'Dice appearance ◇','选择骰子外观':'Choose dice appearance','关闭骰子外观':'Close dice appearance',
 '此刻，选一对与你同行的骰子':'CHOOSE THE DICE FOR YOUR JOURNEY','命运之骰':'Dice of Fate','骰子外观':'Dice appearance','古铜雕刻':'Engraved Bronze','暗色符文':'Dark Runes',
 '圆润包边 · 铆钉雕纹':'Rounded metalwork · Riveted carvings','深色石面 · 琥珀微光':'Dark stone · Amber glow','预览并选用':'Preview and apply','正在使用':'In use','仅供预览 · 待补齐':'Preview only · Incomplete',
 '可拖动旋转的骰子外观预览':'Draggable dice preview','正在备好骰子…':'Preparing the dice…','正在迎回这对骰子…':'Loading these dice…',
 '拖动旋转，滚轮缩放。左为十位，右为个位。':'Drag to rotate. Scroll to zoom. Tens on the left, units on the right.',
 '拖动旋转，滚轮缩放。当前仅展示原作百分骰。':'Drag to rotate and scroll to zoom. Only the original percentile die is shown.',
 '这对骰子暂未抵达，请稍后重试。当前骰子仍可使用。':'These dice could not be loaded. Your current dice remain available.',
 '模型：':'Model:','原作与署名':'Original and attribution','已选用「古铜雕刻」· 外观已记住':'Engraved Bronze selected · Appearance saved',
 '「暗色符文」仅供预览：缺少配套个位骰。桌面仍使用「古铜雕刻」。':'Dark Runes is a preview: its matching units die is missing. Engraved Bronze remains on the table.',
 '点击掷骰':'Roll the dice','拿起端详 · 拖动旋转':'Inspect · Drag to rotate','父母健在':'Parents living','父母已离世':'Parents have passed away','已有婚姻关系':'Married','人生七章':'Seven chapters','此生所持':'Life elements',
};
english['跟随引导']='Guided tour';
english['进度自动保存，刷新后可以续玩。完整传记在终局生成，已发生的手记可以在档案中查看。真人联机、广告与支付尚未开放。']='Progress is saved automatically, so you can refresh and continue. The full memoir is generated at the end; existing notes are in your dossier. Multiplayer, advertising and payments are not available yet.';
english['左页交代处境，右页承接选择或故事。页底前后翻阅只改变阅读位置，不会推进人生。固定事件先选一项再确认；自由事件先写目标、选至多两张元素并请司书评估，读清概率与风险后再点击桌上骰子执行。']='The left page sets the scene and the right holds choices or story. Page arrows change your reading position without advancing life. Confirm a fixed choice, or write a free-action goal, select up to two elements and request an assessment before clicking a table die to act.';
english['左右方向键也可以翻阅书页。顶部的此生档案可查看全部卡牌、同行者和手记。点击跟随引导，可以随时重看操作步骤。']='The left and right arrow keys also turn pages. Open Life dossier at the top for all cards, companions and notes. Use Guided tour below to replay the instructions at any time.';
const keys=Object.keys(english).sort((a,b)=>b.length-a.length);
export function bookText(value:string,locale:string,fallback=(v:string)=>translateText(v,locale)):string{
  if(locale!=='en')return fallback(value);if(english[value])return english[value];
  if(/^第(\d+)回合$/.test(value))return value.replace(/^第(\d+)回合$/,'Round $1');
  for(const key of keys)if(value.includes(key))value=value.replaceAll(key,english[key]);return fallback(value);
}
const originals=new WeakMap<Node,{source:string;shown:string}>();
const attributes=new WeakMap<Element,Map<string,{source:string;shown:string}>>();
let language='zh-CN',queued=false;
function apply(){
  queued=false;
  for(const root of document.querySelectorAll('.masthead,#invitation,#help,#interface>footer,.inspect-dice,.dice-inspector,#stage,#card-targets')){
    for(const element of [root,...root.querySelectorAll('[aria-label],[title]')]){
      const saved=attributes.get(element)||new Map();attributes.set(element,saved);
      for(const attr of ['aria-label','title']){const value=element.getAttribute(attr);if(value===null)continue;const old=saved.get(attr),source=old&&value===old.shown?old.source:value,shown=bookText(source,language);saved.set(attr,{source,shown});if(value!==shown)element.setAttribute(attr,shown);}
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null;
    while((node=walker.nextNode())){
      const value=node.textContent||'',old=originals.get(node),source=old&&value===old.shown?old.source:value;
      const text=source.trim(),shown=text?source.replace(text,bookText(text,language)):source;
      originals.set(node,{source,shown});if(value!==shown)node.textContent=shown;
    }
  }
}
const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(apply);}});
export function setBookLocale(locale:string){language=locale;apply();}
export function watchBookLocale(){observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
