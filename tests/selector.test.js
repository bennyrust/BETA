import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapIndex,loopOffset} from '../js/selector-math.js';
test('selector wraps in both directions without accumulating an end stop',()=>{
 assert.equal(wrapIndex(-1,12),11);assert.equal(wrapIndex(12,12),0);
 for(const cycle of [-10000,-100,0,100,10000]){
  assert.equal(wrapIndex(cycle*12+3,12),3);
  assert.equal(loopOffset(3,cycle*12+3,12),0);
  assert.equal(loopOffset(2,cycle*12+3,12),-1);
  assert.equal(loopOffset(4,cycle*12+3,12),1);
 }
 assert.equal(loopOffset(0,11.5,12),.5);
});
