import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {piecePageUrl} from '../js/pieces.js';
import {sceneObjects,selectableNames} from '../js/config.js';
const records=JSON.parse(await readFile(new URL('../pieces/pieces.json',import.meta.url)));
test('twelve embedded vape models share one branch repository and four room instances',async()=>{
const vapes=records.filter(p=>p.pageId==='vapes'&&p.id!=='vapes');assert.equal(vapes.length,12);
for(const p of vapes){assert.equal(p.repositoryId,'vapes');assert.ok(piecePageUrl(p).endsWith('/pieces/vapes/'));const b=await readFile(new URL('../'+p.assets[0],import.meta.url));assert.equal(b.toString('ascii',0,4),'glTF');const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.ok(j.meshes.length);assert.ok(j.images.every(i=>Number.isInteger(i.bufferView)));}
const placed=sceneObjects.filter(o=>vapes.some(p=>p.sceneName===o.name));assert.equal(placed.length,4);for(const o of placed)assert.ok(selectableNames.has(o.name));
});
