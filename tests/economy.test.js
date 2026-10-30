import test from 'node:test';
import assert from 'node:assert/strict';
import {price,reward,initialState,award,buy} from '../js/economy-rules.js';
test('daily prices follow fixed S&P baseline',()=>{assert.equal(price('toy',{close:110,baseClose:100}),110);assert.equal(price('vape',{close:100,baseClose:100}),75);assert.throws(()=>price('toy',{close:NaN,baseClose:100}));});
test('reward amount and session deduplication',()=>{const s=initialState();assert.equal(award(s,'game1','bowling',150),300);assert.equal(award(s,'game1','bowling',150),0);assert.equal(s.coins,300);assert.equal(reward('gallery',12550),125);assert.throws(()=>reward('bowling',301));});
test('purchase deducts and grants exactly once',()=>{const s=initialState();s.coins=200;buy(s,'purchase1','luigi',100);buy(s,'purchase1','luigi',100);assert.equal(s.coins,100);assert.equal(s.items.luigi,1);});
test('insufficient coins leave wallet and inventory unchanged',()=>{const s=initialState();const before=JSON.stringify(s);assert.throws(()=>buy(s,'purchase1','luigi',100));assert.equal(JSON.stringify(s),before);});
