import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('black swan never grants cards and preserves the existing 35 percent adverse-event threshold',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const start=html.indexOf('function handleSwan(){'),end=html.indexOf('\nfunction nextChapter()',start);
  assert(start>=0&&end>start);
  const handler=html.slice(start,end);let quiet=0,adverse=0;
  for(let i=0;i<1000;i++){
    const cards=[{name:'健康',level:1}],journal=[];
    const state={stage:3,cards,pendingAward:null,pendingNext:null};let modal='';
    vm.runInNewContext('('+handler+')()',{
      state,Math:{random:()=>i/1000},roman:['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'],
      entry:(stage,type,text)=>journal.push({stage,type,text}),
      award:()=>assert.fail('Black swan must not grant or upgrade a card'),
      esc:String,openModal:text=>modal=text
    });
    assert.equal(journal.length,1);
    assert.equal(state.cards.length,1);assert.equal(state.cards[0].level,1);
    assert.equal(state.pendingAward,null);assert.equal(state.pendingNext,null);
    assert(!modal.includes('命运馈赠'));assert(modal.includes('next-chapter'));
    if(state.swanResult.title==='波澜未起')quiet++;
    else {assert.equal(state.swanResult.title,'逆风时刻');adverse++;}
  }
  assert.equal(quiet,650);assert.equal(adverse,350);
});
