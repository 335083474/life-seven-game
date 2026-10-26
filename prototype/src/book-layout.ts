type Snapshot={screen:string;locale:string;life:any;readyToRoll:boolean;selected:string[]};
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function compactAssessment(panel:Element,en:boolean){
  const rate=panel.children[1] as HTMLElement|undefined,reasoning=panel.firstElementChild;
  const paragraphs=reasoning?[...reasoning.children].filter(n=>n.tagName==='P'):[];
  const audit=document.createElement('details'),title=document.createElement('summary');audit.className='book-calculation';title.textContent=en?'Element matches and calculation':'逐卡匹配与计算明细';audit.append(title);
  for(const p of paragraphs)if(p!==paragraphs[0]&&!p.classList.contains('risk'))audit.append(p);reasoning?.append(audit);
  if(rate){rate.classList.add('book-roll-chance');const label=document.createElement('span');label.textContent=en?'Chance of success':'本次成功率';rate.prepend(label);rate.remove();}
  return rate;
}
/** The shared goal input updates its panel without replacing the focused textarea. */
export function refreshBookAssessment(app:HTMLElement,s:Snapshot){
  const panel=app.querySelector('#probability-panel');if(!panel||!app.querySelector('.book-leaf--assessment'))return;
  app.classList.toggle('book-assessment-stale',!s.readyToRoll);
  const message=app.querySelector<HTMLElement>('.book-action-updated');if(message)message.hidden=s.readyToRoll;
  if(s.readyToRoll){const rate=compactAssessment(panel,s.locale==='en');if(rate)app.querySelector('.book-roll-chance')?.replaceWith(rate);}
}
export function bookInstruction(s:Snapshot){
  const en=s.locale==='en',text=(zh:string,english:string)=>en?english:zh;
  if(s.screen==='home')return {title:text('从这里落笔','Begin your story'),body:text('选择继续这一生，或另写一生。从七岁抽取四张初始元素开始。','Continue a saved life or begin a new one with four initial elements at age seven.')};
  if(s.screen==='new')return {title:text('从七岁抽天赋开始','Begin with your gifts at seven'),body:text('写下姓名，再揭晓父母与三张随机人生元素。确认这副初始手牌后，才进入少年抉择。','Name this life, then reveal Parents and three random elements. Confirm your starting hand before entering youth.')};
  if(s.life?.phase==='draw')return {title:text('天赋已揭晓，确认后启程','Your gifts are revealed'),body:text('这四张初始元素已经保存。看过后点击「确认天赋，进入少年抉择」，开始这一生的第一次选择。','Your four starting elements are saved. Review them, then confirm your gifts to enter youth and make your first choice.')};
  if(s.life?.pending)return {title:text('先处理眼前的代价','Resolve this consequence'),body:text('读清本次失去的原因，再选择自行承担或使用当前可用的保护。处理完成后才能继续。','Read the cause of this loss, then accept it or use an available protection before continuing.')};
  if(s.life?.awards?.length)return {title:text('七个位置，认真取舍','Make room among seven elements'),body:text('这次获得新元素时手牌已满。比较要留下的东西，再在对页确认取舍。','Your hand is full. Compare what you wish to keep, then confirm your decision on the facing page.')};
  const items:Record<string,[string,string,string,string]>={
    fixed:['读一段人生，作一个选择','Read, then choose','左页是这一年的处境，右页是可选的道路。先选一项，再写下这一选择；后果在确认之后揭晓。','The left page sets the scene; the right offers your choices. Select one and confirm. Consequences are revealed afterwards.'],
    free:['写下行动，再交给命运','Write, equip, then roll','先写一个具体目标，选至多两张关键元素，也可展开邀请同行者。请司书评估后，查看概率与风险，再点击桌上骰子执行。','Write a concrete goal and select up to two key elements. Companions are optional. Ask for an assessment, review the chance and risk, then click a table die to act.'],
    rolled:['骰点已定，决定是否接受','The die has landed','对页会列出可用的机遇。若不使用机遇重掷，点击接受结果完成结算；单纯翻书不会结算。','Available opportunities appear opposite. Accept the result to settle it, or explicitly use an opportunity to reroll. Turning a page does not settle the event.'],
    'free-result':['读完这一笔，继续向前','Read what this choice became','左页记录行动与骰点，右页写下已发生的故事。读完后点击面对黑天鹅，进入本回合最后一步。','Your action and die result are on the left; the story unfolds on the right. When ready, face the Black Swan to finish this round.'],
    swan:['最后，面对无法预知的事','Face the unforeseen','这一步不选卡，也不用司书评估。读清对页说明后，点击桌上骰子或书内的投骰按钮。','No card selection or assessment is needed. Read the facing page, then click a table die or the roll button in the book.'],
    'round-end':['这一页已写下','This page is written','对页记录本次黑天鹅的实际结果。确认后继续这一生，进入下一个年龄；最后一回合将结算此生。','Read the actual Black Swan outcome opposite, then continue to the next age. The final round leads to your ending.'],
    ending:['把走过的一生，读成故事','Read the life you have written','先回顾终局留下的元素，再在对页生成或继续阅读七章传记。传记完成前也可以查看真实手记。','Review the elements you kept, then generate or continue the seven-chapter memoir opposite. Your factual journal remains available.'],
  };
  const v=items[s.life?.phase]||items.ending;return {title:text(v[0],v[1]),body:text(v[2],v[3])};
}
export function instructionHTML(s:Snapshot){const i=bookInstruction(s);return `<div class="book-instruction"><span>${s.locale==='en'?'THE NEXT STROKE':'此刻，如何落笔'}</span><h3>${escape(i.title)}</h3><p>${escape(i.body)}</p></div>`;}

/** Reparent the original live controls into purpose-built facing leaves. */
export function arrangeBookSpread(app:HTMLElement,s:Snapshot){
  const en=s.locale==='en',text=(zh:string,english:string)=>en?english:zh;
  const leaf=(side:string)=>{const node=document.createElement('section');node.className=`book-leaf book-leaf--${side}`;return node;};
  const note=(title:string,body:string)=>{const node=document.createElement('div');node.className='book-instruction';const h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=body;node.append(h,p);return node;};
  const pages:HTMLElement[]=[];
  const main=app.querySelector<HTMLElement>('main')!;if(!main)return;
  app.classList.remove('book-assessment-stale');
  const append=(...nodes:(Node|null|undefined)[])=>nodes.forEach(n=>n&&pages.at(-1)!.append(n));
  const next=(side:string)=>{const p=leaf(side);pages.push(p);return p;};
  const intro=(node:HTMLElement)=>{
    const concise:Record<string,[string,string]>={
      fixed:['读左页的处境，在对页选一项，再写下选择。','Read this situation, choose an option opposite, then confirm it.'],
      'free-result':['故事见对页，读完后继续。','Read the story opposite, then continue.'],
      rolled:['骰点已保存。在对页接受结果，或明确使用机遇重掷。','The die result is saved. Accept it opposite or explicitly use an opportunity to reroll.'],
      swan:['这一步不选卡、不评估。读完对页说明，点击骰子。','No cards or assessment here. Read the facing page, then click a die.'],
      'round-end':['读完对页记录，再继续人生。','Read the record opposite, then continue this life.'],
    };
    const hint=concise[s.life?.phase];
    node.insertAdjacentHTML('beforeend',hint?`<div class="book-instruction book-instruction--compact"><span>${text('此刻，如何落笔','YOUR NEXT STEP')}</span><p>${text(...hint)}</p></div>`:instructionHTML(s));
  };
  const chapter=app.querySelector('.play__stage-head'),progress=app.querySelector('.phase-progress'),status=app.querySelector('.solo-status');
  app.dataset.bookPhase=s.screen==='home'||s.screen==='new'?s.screen:s.life?.pending?'pending':s.life?.awards?.length?'award':s.life?.phase||s.screen;
  if(s.screen==='home'){
    const start=app.querySelector('[data-action="start"]'),resume=app.querySelector('[data-action="resume"]');
    if(start)start.textContent=text('开启新人生 · 抽取天赋','New life · draw your gifts');
    if(resume)resume.textContent=text('继续这一生 · 读取存档','Continue this life · saved progress');
    next('story');append(app.querySelector('.hero__title'),app.querySelector('.hero__desc'));intro(pages[0]);
    next('choice');append(note(text('一生，分七章书写','One life, seven chapters'),text('每回合先经历固定事件，再选择自由行动，最后面对黑天鹅。终局需要留下七种不同元素。','Each round brings a fixed event, a free action and a Black Swan. Keep seven distinct elements by the end.')),
      app.querySelector('.hero__actions'),status,
      note(text('翻书不会替你决定','Reading leaves choices to you'),text('点击或拖动外侧页角，只改变阅读位置。书内写下选择、接受结果等按钮，才会推进这一生。','Clicking or dragging an outer corner only changes what you read. Confirming a choice or accepting a result advances this life.')));
  }else if(s.screen==='new'||s.life?.phase==='draw'){
    const draw=app.querySelector('.draw')!,cards=draw.querySelector('.draw__cards'),actions=draw.querySelector('.draw__actions'),foot=draw.querySelector('.draw__footnote');
    const revealed=s.screen==='draw'&&s.life?.phase==='draw';
    const steps=document.createElement('div');steps.className='book-opening-steps';steps.setAttribute('aria-label',text('新人生开局流程','New life opening'));
    steps.innerHTML=[text('① 写下姓名','① Name'),text('② 抽取天赋','② Draw gifts'),text('③ 确认启程','③ Begin')].map((label,index)=>`<span${index===(revealed?2:1)?' aria-current="step"':''}>${label}</span>`).join('');
    const confirm=actions?.querySelector('[data-action="advance"]');if(confirm)confirm.textContent=text('确认天赋，进入少年抉择 →','Confirm gifts · enter youth →');
    next('story');append(...[...draw.children].filter(n=>n!==cards&&n!==actions&&n!==foot&&n!==status),foot);
    next('choice');append(steps,note(text(revealed?'此生的初始天赋':'七岁 · 抽取初始天赋',revealed?'Your starting gifts':'Age seven · draw your gifts'),text(revealed?'父母与三张随机元素已经保存。确认后，才进入第一场固定事件。':'父母固定保留，另外三张随机抽取。写好名字后，点击下方揭晓。',revealed?'Parents and three random elements are saved. Confirm to enter your first fixed event.':'Parents is guaranteed; three other elements are drawn at random. Write your name, then reveal them below.')),cards,status,actions);
  }else if(s.screen==='ending'){
    next('story');append(app.querySelector('.ending-header'),app.querySelector('.solo-summary'));
    next('choice');const wrap=app.querySelector('.ending-wrap');if(wrap)append(...wrap.children);else append(...main.children);intro(pages.at(-1)!);
  }else{
    const center=app.querySelector('.play-center')!;if(!center)return;
    next('story');append(chapter,progress,status);
    if(s.life?.pending||s.life?.awards?.length){intro(pages[0]);next('choice');append(...center.children);}
    else if(s.life?.phase==='free'){
      // Keep the action form and its native listeners; optional company stays folded.
      const cards=center.querySelector('.free-cards')!,panel=center.querySelector('.roll-panel')!,bottom=center.querySelector('.event-bottom')!,warning=center.querySelector('.notice')!,skip=center.lastElementChild!,presets=center.querySelector('.free-presets')!;
      const agreement=document.createElement('details'),agreementTitle=document.createElement('summary');agreement.className='book-agreement';agreementTitle.textContent=text('关于结果与保存','About results and saving');agreement.append(agreementTitle,warning);
      const companions=[...center.querySelectorAll('.solo-npc-check')],rules=[...center.querySelectorAll('.paper-rule')];
      const choices=leaf('choice');choices.classList.add('book-loadout');
      const loadoutTitle=document.createElement('h3');loadoutTitle.className='book-loadout-title';loadoutTitle.textContent=text(`关键元素 ${s.selected.length} / 2`,`Key elements ${s.selected.length} / 2`);choices.append(loadoutTitle);
      const selectionHint=document.createElement('div');selectionHint.className='book-selection-hint';selectionHint.textContent=text('点选卡牌，再点取消；至多两张。','Click to select or deselect; up to two.');choices.append(selectionHint);
      for(const button of cards.querySelectorAll('button')){const selected=button.classList.contains('selected');button.setAttribute('aria-pressed',String(selected));if(selected){const stamp=document.createElement('span');stamp.className='book-selected-stamp';stamp.textContent=text('已选','Selected');button.append(stamp);}}
      if(companions.length){const d=document.createElement('details');d.className='book-companions';const summary=document.createElement('summary');summary.textContent=text('邀请同行者（可选）','Invite companions (optional)');d.append(summary,...companions);choices.append(d);}
      rules.forEach(n=>n.remove());cards.previousElementSibling?.classList.contains('solo-hint')&&cards.previousElementSibling.remove();choices.append(cards);
      // Everything through the goal presets belongs to the writing page.
      for(const child of [...center.children]){if(child===panel||child===bottom||child===warning||child===skip)continue;append(child);if(child===presets)break;}
      pages.push(choices);
      if(s.readyToRoll){
        const rate=compactAssessment(panel,en);
        next('assessment');append(note(text('司书已读过你的行动','The scribe has assessed your action'),text('难度与风险已确定。展开明细可看逐卡理由；改目标或同行者要重新评估。','Difficulty and risk are set. Expand the details for each element. Changing the goal or companions needs a new assessment.')),panel);
        next('choice');append(note(text('准备好，就掷下这一刻','When ready, cast the dice'),text('这是正式行动。点击桌上任一颗骰子，或下方的锁定并投骰按钮；确认后不能反悔。','This is the committed action. Click either table die or the lock-and-roll button below. The action cannot be undone.')));
        const updated=note(text('行动已更改','Your action has changed'),text('请重新评估，旧概率不再适用于这次行动。','Request a new assessment; the previous chance no longer applies.'));updated.classList.add('book-action-updated');updated.hidden=true;append(updated);
        if(rate)append(rate);
        append(agreement,bottom,skip);
      }else{agreementTitle.textContent=text('其他选择：跳过／规则','Other options: skip / rules');agreement.append(skip);append(panel,agreement,bottom);}
    }else{
      const children=[...center.children];
      if(s.life.phase==='free-result'){
        const goal=children.find(n=>n.tagName==='P');
        if(goal&&(goal.textContent?.length||0)>50){const d=document.createElement('details'),summary=document.createElement('summary');summary.textContent=text('重读本次行动','Read the full action');goal.before(d);d.append(summary,goal);children.splice(children.indexOf(goal),1,d);}
        const records=children.filter(n=>n.matches('.solo-hint,.solo-panel:not(.solo-stream),.solo-audit,[data-action="source-facts"]'));
        if(records.length){const d=document.createElement('details'),summary=document.createElement('summary');d.className='book-story-notes';summary.textContent=text('本次记录与故事依据','Event record and story sources');d.append(summary,...records);for(const record of records)children.splice(children.indexOf(record),1);const action=children.findIndex(n=>n.classList.contains('solo-actions'));children.splice(action<0?children.length:action,0,d);}
      }
      const boundary=s.life.phase==='fixed'?center.querySelector('.paper-rule'):s.life.phase==='free-result'?center.querySelector('.solo-story'):s.life.phase==='rolled'?center.querySelector('.solo-panel,.solo-actions'):s.life.phase==='swan'?center.querySelector('.solo-hint'):center.querySelector('.solo-panel,.solo-actions');
      let choicePage=false;
      for(const child of children){if(child===boundary&&!choicePage){intro(pages[0]);next('choice');choicePage=true;}append(child);}
      if(!choicePage){next('choice');intro(pages.at(-1)!);}
    }
  }
  // The saved dossier is available in a drawer and never consumes story leaves.
  app.replaceChildren(...pages);
  for(const option of app.querySelectorAll('.option'))option.setAttribute('aria-pressed',String(option.classList.contains('selected')));
  return pages;
}
