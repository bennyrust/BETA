import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
function parse(bytes){const size=bytes.readUInt32LE(12);return {json:JSON.parse(bytes.toString('utf8',20,20+size)),binary:bytes.subarray(28+size)};}
function geometry({json,binary}){const images=new Set((json.images||[]).map(i=>i.bufferView));return json.bufferViews.flatMap((v,i)=>images.has(i)?[]:[binary.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)]);}
const models=JSON.parse(await readFile(new URL('optimized/models.json',root)));
for(const model of models){const before=await readFile(new URL(model.source,root)),after=await readFile(new URL(model.runtime,root));assert.equal(hash(before),(model.publishedSourceSha256??model.sourceSha256),`${model.source} changed: regenerate its runtime asset`);assert(model.runtime===model.source||model.runtime.includes(hash(after).slice(0,16)),`Content hash mismatch: ${model.runtime}`);const a=parse(before),b=parse(after);assert.deepEqual(b.json.meshes,a.json.meshes);assert.deepEqual(geometry(b),geometry(a),`Geometry changed: ${model.source}`);}
let mediaCount=0;for(const file of ['optimized/media.json','optimized/images.json'])for(const item of JSON.parse(await readFile(new URL(file,root)))){const bytes=await readFile(new URL(item.runtime,root));assert(item.runtime===item.source||item.runtime.includes(hash(bytes).slice(0,16)));assert.equal((await stat(new URL(item.source,root))).size,(item.publishedSourceBytes??item.sourceBytes));mediaCount++;}
console.log(`Verified ${models.length} source/runtime models with byte-identical geometry and ${mediaCount} runtime media files.`);
