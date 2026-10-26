import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {Window} from 'happy-dom';
const {installBookGuide}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(readFileSync(new URL('../src/book-guide.ts',import.meta.url),'utf8'))).toString('base64'));
test('first-play guide waits for readiness, follows open, remembers dismissal, and replays in the selected language',t=>{
 const window=new Window(),old={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage};Object.assign(globalThis,{window,document:window.document,localStorage:window.localStorage});t.after(()=>{Object.assign(globalThis,old);window.happyDOM.abort();});
 document.body.innerHTML='<button id="open"></button><div class="folio-navigation"></div><div class="folio-viewport"></div><div id="card-targets"></div><button class="dice-hit"></button>';
 let opened=false,snapshot={locale:'zh-CN',screen:'home',life:null,busy:true};
 const guide=installBookGuide({snapshot:()=>snapshot,opened:()=>opened,open:()=>opened=true});
 guide.ready();assert.equal(guide.active,false);snapshot.busy=false;guide.refresh();assert.equal(guide.active,true);
 const panel=document.querySelector('.book-guide'),next=panel.querySelector('[data-tour-next]');
 next.click();assert(opened);assert.equal(panel.dataset.step,'pages');assert(document.querySelector('.folio-navigation').classList.contains('book-guide-target'));
 for(let i=0;i<3;i++)next.click();assert.equal(panel.dataset.step,'dice');next.click();assert.equal(guide.active,false);assert.equal(localStorage.getItem('fate-book-guide-v1'),'done');assert.equal(document.querySelector('.book-guide-target'),null);
 const second=installBookGuide({snapshot:()=>snapshot,opened:()=>opened,open(){}});second.ready();assert.equal(second.active,false);
 snapshot.locale='en';second.start();assert.equal(second.active,true);assert.match(document.body.textContent,/Read the facing pages/);
 document.querySelectorAll('[data-tour-skip]')[1].click();assert.equal(second.active,false);
 // Storage failure never prevents the player from dismissing a guide.
 Object.defineProperty(globalThis,'localStorage',{value:{getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}},configurable:true});
 const third=installBookGuide({snapshot:()=>snapshot,opened:()=>opened,open(){}});third.ready();document.querySelectorAll('[data-tour-skip]')[2].click();assert.equal(third.active,false);
});
