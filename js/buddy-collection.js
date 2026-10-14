import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { splitPosts, greentext } from './post-text.js';
export function renderCollection(records,figures,counts){
 const host=document.getElementById('collectionRows'),replies=document.getElementById('collectionReplies');host.replaceChildren();replies.replaceChildren();const cleanup=[];
 for(const record of records){
  if(!counts[record.id])continue;
  const source=figures.find(f=>f.userData.id===record.id);if(!source)continue;
  const entry=document.createElement('div');entry.className='collectionEntry';
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',record.name+' collected model');
  const count=document.createElement('p');count.className='collectionCount';count.textContent='> '+record.name.trim()+': '+counts[record.id];entry.append(canvas,count);host.append(entry);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.01,100);scene.add(new THREE.HemisphereLight(0xffffff,0x444444,.9));const light=new THREE.DirectionalLight(0xffffff,1.1);light.position.set(2,3,4);scene.add(light);
  const object=clone(source.children[0]);scene.add(object);object.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(object,true),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());object.position.sub(center);
  const pivot=new THREE.Group();scene.remove(object);pivot.add(object);scene.add(pivot);
  function draw(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=Math.max(size.y,size.x/camera.aspect)/2/Math.tan(Math.PI/9)*1.3+size.z;camera.updateProjectionMatrix();renderer.render(scene,camera);}
  let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,yaw:pivot.rotation.y};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(drag){pivot.rotation.y=drag.yaw+(e.clientX-drag.x)*.012;draw();}});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  const observer=new ResizeObserver(draw);observer.observe(canvas);draw();cleanup.push(()=>{observer.disconnect();renderer.dispose();object.traverse(n=>n.skeleton?.dispose());});
  for(const lines of splitPosts(record.description||'')){
   if(!lines.some(line=>line.trim()))continue;
   const post=document.createElement('section');post.className='previewReply';const header=document.createElement('header');header.className='replyHeader';const author=document.createElement('span');author.className='postAuthor';author.textContent='Anonymous';const name=document.createElement('span');name.textContent=record.name;header.append(author,name);const body=document.createElement('div');body.className='replyBody';for(const line of lines){const row=document.createElement('span');row.className='greentextLine';row.textContent=greentext(line);body.append(row);}post.append(header,body);replies.append(post);
  }
 }
 if(!host.children.length)host.textContent='No toys collected yet.';
 return ()=>cleanup.forEach(dispose=>dispose());
}
