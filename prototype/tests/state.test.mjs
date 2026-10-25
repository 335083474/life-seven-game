import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,toggleElement,chance,d100,verdict,settle} from '../src/state.mjs';

test('selection is limited to two known elements and can be changed before rolling',()=>{
  const s=initialState();
  assert.equal(toggleElement(s,'unknown').ok,false);
  assert.equal(toggleElement(s,'knowledge').ok,true);
  assert.equal(toggleElement(s,'wealth').ok,true);
  assert.equal(chance(s),69);
  assert.equal(toggleElement(s,'health').ok,false);
  assert.deepEqual(s.selected,['knowledge','wealth']);
  toggleElement(s,'wealth');toggleElement(s,'friends');
  assert.deepEqual(s.selected,['knowledge','friends']);
});
test('D100 rejects the biased tail and includes both endpoints',()=>{
  let values=[4294967295,0],calls=0;
  assert.equal(d100(array=>{array[0]=values[calls++];}),1);
  assert.equal(calls,2);
  assert.equal(d100(array=>{array[0]=99;}),100);
});
test('one result settles only once and locks the selected elements',()=>{
  const s=initialState();assert.throws(()=>settle(s,20));
  toggleElement(s,'knowledge');toggleElement(s,'wealth');
  assert.deepEqual(settle(s,69),{dice:69,probability:69,outcome:'成功'});
  assert.equal(toggleElement(s,'wealth').ok,false);
  assert.throws(()=>settle(s,1));
  assert.equal(s.roll.dice,69);
});
test('critical, success and failure boundaries are explicit',()=>{
  assert.equal(verdict(1,45),'大成功');
  assert.equal(verdict(45,45),'成功');
  assert.equal(verdict(46,45),'普通失败');
  assert.equal(verdict(96,45),'大失败');
  assert.equal(verdict(96,69),'普通失败');
  assert.equal(verdict(100,69),'大失败');
  for(const n of [0,101,1.5])assert.throws(()=>verdict(n,50));
});
