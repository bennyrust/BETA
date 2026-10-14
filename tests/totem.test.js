import test from 'node:test';
import assert from 'node:assert/strict';
import {totemSequence,sequenceForVersion,TOTEM_PIXELS_PER_UNIT} from '../js/totem-sequence.js';
test('Totem Pole has ten complete 100–5–100 percent cycles with shared endpoints',()=>{
 const values=totemSequence();assert.equal(values.length,381);assert.equal(values[0],1);assert.equal(values.at(-1),1);
 for(let cycle=0;cycle<10;cycle++){const start=cycle*38;assert.equal(values[start],1);assert.equal(values[start+19],.05);assert.equal(values[start+38],1);for(let n=1;n<=19;n++)assert.ok(values[start+n]<values[start+n-1]);for(let n=20;n<=38;n++)assert.ok(values[start+n]>values[start+n-1]);}
});

test('V2 crushes once in 0.2 percentage point steps while V1 is preserved',()=>{
 assert.deepEqual(sequenceForVersion('V1'),totemSequence());
 const v=sequenceForVersion('V2');assert.equal(v.length,499);assert.equal(v[0],1);assert.equal(v.at(-1)*TOTEM_PIXELS_PER_UNIT,1);
 assert.ok(v.at(-2)>v.at(-1));assert.ok(v.at(-2)-v.at(-1)<.002);
 for(let i=1;i<v.length-1;i++)assert.ok(Math.abs(v[i-1]-v[i]-.002)<1e-12);
 assert.deepEqual(sequenceForVersion('V3'),v);
 assert.throws(()=>sequenceForVersion('V4'));
});

import {photoStage} from '../js/totem-photo-stages.js';
test('Photographic stages never reverse as the V3 tower compresses',()=>{
 const ratios=[1,.857,.671,.483,.317,.189];let previous=0;
 for(const ratio of sequenceForVersion('V3')){
  const stage=photoStage(ratio,ratios),selected=stage.mix<.5?stage.from:stage.to;
  assert.ok(selected>=previous);assert.ok(stage.mix>=0&&stage.mix<=1);previous=selected;
 }
 assert.equal(previous,5);
});
