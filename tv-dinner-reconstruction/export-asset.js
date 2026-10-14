import * as THREE from 'three';
import {GLTFExporter} from './vendor/GLTFExporter.js';
// Bakes the editable transform animation into standard glTF tracks.
export async function exportAsset(poc){
 const nodes=[];poc.scene.traverse(n=>{if(n.isMesh||n.type==='Group'){n.name=n.name||`node_${nodes.length}`;nodes.push(n)}});const records=nodes.map(n=>({n,p:[],q:[],s:[]}));const times=[];
 for(let i=0;i<=32;i++){poc.setTime(i/4);times.push(i/4);for(const r of records){r.p.push(...r.n.position.toArray());r.q.push(...r.n.quaternion.toArray());r.s.push(...r.n.scale.toArray())}}
 const tracks=[];for(const r of records){for(const [channel,type,stride,property]of [['p',THREE.VectorKeyframeTrack,3,'position'],['q',THREE.QuaternionKeyframeTrack,4,'quaternion'],['s',THREE.VectorKeyframeTrack,3,'scale']]){const a=r[channel];if(a.some((v,i)=>Math.abs(v-a[i%stride])>1e-6))tracks.push(new type(r.n.uuid+'.'+property,times,a))}}
 poc.setTime(0);poc.scene.updateMatrixWorld(true);const clip=new THREE.AnimationClip('TV Dinner — edit 03:00–03:08 (approximate)',8,tracks);
 const result=await new GLTFExporter().parseAsync(poc.scene,{binary:true,animations:[clip],onlyVisible:true,maxTextureSize:1024});return result;
}
