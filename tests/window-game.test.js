import test from 'node:test';import assert from 'node:assert/strict';
import {Gallery,makeRound,pointsForHit,score,roundDifficulty} from '../pieces/window/game-core.js';
test('rounds include both types and become more demanding',()=>{for(let r=1;r<=10;r++){const plan=makeRound(r,()=>.4);assert(plan.some(t=>t.type==='T'));assert(plan.some(t=>t.type==='CT'));assert(plan.every(t=>t.lifetime>=950));}assert(makeRound(10,()=>.4)[0].lifetime<makeRound(1,()=>.4)[0].lifetime);});
test('hits require upright live targets; each target scores only once',()=>{const g=new Gallery(()=>.3);g.begin(0);g.tick(500);const t=g.targets[0];assert.equal(g.shoot(t.id,501).hit,false);assert(g.shoot(t.id,t.ready+10).hit);assert.equal(g.shoot(t.id,t.ready+20).hit,false);assert.equal(g.stats.hits,1);assert.equal(g.stats.shots,3);});
test('speed and accuracy reward careful fast play',()=>{assert(pointsForHit(100,2000)>pointsForHit(1800,2000));const s={points:3000,hits:3,shots:3,escaped:0};assert(score(s)>score({...s,shots:6}));assert(score(s)>score({...s,escaped:1}));assert.equal(score({...s,points:0,escaped:5}),0);});
test('all ten randomized rounds finish and escapes count exactly once',()=>{const g=new Gallery(()=>.5);let now=0;for(let r=1;r<=10;r++){g.begin(now);let guard=0;while(g.state==='playing'&&guard++<1000){now+=100;g.tick(now);assert(g.targets.length<=3);assert(g.targets.every(t=>t.x>=.12&&t.x<=.88&&t.y>=.56&&t.y<=.91));}assert(guard<1000);assert.equal(g.state,r===10?'over':'round-end');}const expected=Array.from({length:10},(_,i)=>makeRound(i+1).length).reduce((a,b)=>a+b,0);assert.equal(g.stats.escaped,expected);assert.equal(g.shoot(1,now),null);g.reset();assert.equal(g.round,0);assert.equal(g.stats.escaped,0);});

test('targets spawn continuously and wander at varying speeds inside the scenery',()=>{
 let seed=123;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const g=new Gallery(random);g.begin(0);g.tick(500);const t=g.targets[0],start=t.x;
 const speeds=new Set();let reversed=false,previous=t.velocity;
 t.lifetime=20000;
 for(let now=516;now<10000;now+=16){g.tick(now);speeds.add(t.goal);if(t.velocity*previous<0)reversed=true;previous=t.velocity;assert(t.x>=.12&&t.x<=.88);}
 assert.notEqual(t.x,start);assert(speeds.size>3);assert(reversed);assert.equal(t.slot,undefined);
});

test('every successive round adds targets, increases movement speed and shortens escape time',()=>{
 for(let round=2;round<=10;round++){
  const before=roundDifficulty(round-1),after=roundDifficulty(round);
  assert(after.count>before.count);assert(after.speed>before.speed);assert(after.lifetime<before.lifetime);assert(after.spawnDelay<before.spawnDelay);
  const previous=makeRound(round-1,()=>.5),next=makeRound(round,()=>.5);
  assert.equal(next.length,previous.length+2);assert(next.every(t=>t.lifetime<previous[0].lifetime));
  const a=new Gallery(()=>.5),b=new Gallery(()=>.5);a.round=round-2;b.round=round-1;a.begin(0);b.begin(0);a.tick(500);b.tick(500);
  assert(Math.abs(b.targets[0].velocity)>Math.abs(a.targets[0].velocity));
 }
});
