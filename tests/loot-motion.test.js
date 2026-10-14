import test from 'node:test';
import assert from 'node:assert/strict';
import { lootPose,SHAKE_SECONDS,FLIGHT_SECONDS,SETTLE_SECONDS } from '../js/loot-motion.js';
test('loot rises in an arc, lands on the floor, and settles without sinking',()=>{
 const launch=lootPose(SHAKE_SECONDS),apex=lootPose(SHAKE_SECONDS+FLIGHT_SECONDS/2),land=lootPose(SHAKE_SECONDS+FLIGHT_SECONDS);
 assert.ok(apex.y>launch.y);assert.equal(land.y,0);assert.equal(land.flight,1);
 for(let t=0;t<SETTLE_SECONDS;t+=.01)assert.ok(lootPose(SHAKE_SECONDS+FLIGHT_SECONDS+t).y>=0);
 const end=lootPose(SHAKE_SECONDS+FLIGHT_SECONDS+SETTLE_SECONDS+.01);
 assert.equal(end.done,true);assert.equal(end.y,0);assert.equal(end.wobble,0);
});
