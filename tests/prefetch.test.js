import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWithPrefetch} from '../js/core.js';
test('prefetch overlaps only the next download and decodes in order',async()=>{
 const events=[];let decoding=0;
 await loadWithPrefetch([1,2,3],async n=>{events.push(`fetch${n}`);return n;},async(n,bytes)=>{assert.equal(bytes,n);assert.equal(++decoding,1);events.push(`decode${n}`);await new Promise(r=>setTimeout(r,5));events.push(`end${n}`);decoding--;return n;},{onLoaded:n=>events.push(`loaded${n}`)});
 assert(events.indexOf('fetch2')<events.indexOf('end1'));
 assert(events.indexOf('fetch3')>events.indexOf('end1'));
 assert.deepEqual(events.filter(e=>e.startsWith('loaded')),['loaded1','loaded2','loaded3']);
});
test('prefetch failures do not stop later assets',async()=>{
 const loaded=[],errors=[];await loadWithPrefetch([1,2,3],async n=>{if(n===2)throw Error('missing');return n;},async(n,b)=>b,{onLoaded:n=>loaded.push(n),onError:n=>errors.push(n)});assert.deepEqual(loaded,[1,3]);assert.deepEqual(errors,[2]);
});
test('abort stops decoding queued assets and absorbs pending fetch rejection',async()=>{
 const controller=new AbortController();const loaded=[];
 await loadWithPrefetch([1,2,3],async n=>{if(n===2)throw Error('cancelled');return n;},async(n,b)=>{controller.abort();return b;},{signal:controller.signal,onLoaded:n=>loaded.push(n)});assert.deepEqual(loaded,[1]);
});
