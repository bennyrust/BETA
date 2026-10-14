import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { renderCollection } from './buddy-collection.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRendering } from './rendering.js';
import { previewOrientations } from './preview-config.js';
import { lootPose, SHAKE_SECONDS } from './loot-motion.js';
import { sceneObjects } from './config.js';
import { createMenu } from './menu.js';
import { createPieceCatalog } from './pieces.js';
import { refreshOrientations } from './orientation-store.js';
const status=document.getElementById('lootStatus');
const collectionDialog=document.getElementById('collectionDialog');
const collectionButton=document.getElementById('collectionButton');
const collectionKey='buddyologies-unboxed-v1';
const figureIds=['luigi','crooks','tetsuya','rittenhouse'];
let counts={};try{counts=JSON.parse(localStorage.getItem(collectionKey)||'{}')||{};}catch{}
counts=Object.fromEntries(figureIds.map(id=>[id,Number.isSafeInteger(counts[id])&&counts[id]>=0?counts[id]:0]));
let figureRecords=[],menu,hoverToy=false;
const menuController=new AbortController();
let disposeCollection=()=>{};
function updateCollection(){if(collectionDialog.open){disposeCollection();disposeCollection=renderCollection(figureRecords,figures,counts);}}
collectionButton.addEventListener('click',()=>{menu?.close();collectionDialog.showModal();updateCollection();});
collectionDialog.addEventListener('close',()=>{disposeCollection();disposeCollection=()=>{};});
document.getElementById('collectionClose').addEventListener('click',()=>collectionDialog.close());
collectionDialog.addEventListener('click',e=>{if(e.target===collectionDialog){const r=collectionDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)collectionDialog.close();}});
function popupOpen(){return collectionDialog.open||menu?.isOpen;}

const scene=new THREE.Scene();scene.background=new THREE.Color('#bdb09c');
const camera=new THREE.PerspectiveCamera(37,innerWidth/innerHeight,.05,100);
const rendering=createRendering(scene),canvas=rendering.renderer.domElement;
canvas.setAttribute('aria-label','Buddyologies box on the shelf. Click to open. Drag a landed figure to rotate it.');
// Local left-hand source creates falloff across both the shelf and rear walls.
scene.add(new THREE.HemisphereLight(0xfff4e4,0x34303a,.50));
const key=new THREE.SpotLight(0xffdfb4,95,32,Math.PI/3,.85,2);
key.position.set(-5,5,5);key.target.position.set(0,1,-2);
key.castShadow=true;key.shadow.mapSize.set(2048,2048);
key.shadow.camera.near=.1;key.shadow.camera.far=40;
key.shadow.normalBias=.025;key.shadow.bias=-.0001;key.shadow.radius=4;
scene.add(key,key.target);
const fill=new THREE.DirectionalLight(0xe5ebff,.22);fill.position.set(4,3,6);scene.add(fill);
// Match the photographed box/figure proportions within the existing shelf.
const BOX_X=-1.05, BOX_YAW=-.35, BOX_SCALE=.72, TOY_X=1.1, TOY_HEIGHT=1.05;
// Session-local reveal light: once activated, it stays over the landing place.
const toySpotlight=new THREE.SpotLight(0xfff0d8,24,9,.26,.65,2);
toySpotlight.visible=false;toySpotlight.castShadow=true;
toySpotlight.shadow.mapSize.set(1024,1024);
toySpotlight.shadow.camera.near=.1;toySpotlight.shadow.camera.far=9;
toySpotlight.shadow.bias=-.0001;toySpotlight.shadow.normalBias=.012;
scene.add(toySpotlight,toySpotlight.target);
const box=new THREE.Group();box.scale.setScalar(BOX_SCALE);scene.add(box);
let hinge,tab,lid,lidRest,boxSeat=0,toySeat=0;
const figures=[];let state='loading',hover=false,start=0,active,raf,stopped=false;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function resize(){camera.aspect=innerWidth/innerHeight;camera.position.set(0,2.35,innerWidth<600?13:9);camera.lookAt(0,1.0,0);camera.updateProjectionMatrix();rendering.resize(innerWidth,innerHeight);menu?.resize();}
window.addEventListener('resize',resize);resize();
const boxVolume=new THREE.Box3(new THREE.Vector3(-.82,0,-.92),new THREE.Vector3(.82,1.64,.92));
const toyVolume=new THREE.Box3();
const restMatrix=new THREE.Matrix4(),restRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,BOX_YAW,0));
function boxScreenHit(event,rect){
 // Filled screen silhouette of the whole carton, independent of its jitter.
 restMatrix.compose(new THREE.Vector3(BOX_X,boxSeat,.4),restRotation,new THREE.Vector3(BOX_SCALE,BOX_SCALE,BOX_SCALE));
 camera.updateMatrixWorld(true);
 const points=[];
 for(const x of [boxVolume.min.x,boxVolume.max.x])for(const y of [boxVolume.min.y,boxVolume.max.y])for(const z of [boxVolume.min.z,boxVolume.max.z]){
  const p=new THREE.Vector3(x,y,z).applyMatrix4(restMatrix).project(camera);
  points.push({x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2});
 }
 points.sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=items=>{const out=[];for(const p of items){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 const hull=half(points).slice(0,-1).concat(half([...points].reverse()).slice(0,-1));
 const p={x:event.clientX,y:event.clientY};
 // Small edge allowance covers the physical shake without hover flicker.
 return hull.every((a,i)=>{const b=hull[(i+1)%hull.length];return cross(a,b,p)>=-3*Math.hypot(b.x-a.x,b.y-a.y);});
}
function hit(event,target=box){
 const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,camera);
 target.updateWorldMatrix(true,true);
 if(target===box)return boxScreenHit(event,rect);
 toyVolume.setFromObject(target,true).expandByScalar(.07);return raycaster.ray.intersectsBox(toyVolume);
}
function bendLid(amount){
 for(const {mesh,rest} of lidRest){
 const position=mesh.geometry.attributes.position;
 for(let i=0;i<position.count;i++){const t=(.9-rest[i*3+1])/1.8;position.array[i*3+2]=rest[i*3+2]+amount*t*(2-t);}
 position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
 }tab.position.y=-.012+amount;
}
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

let drag=null,suppressClick=false;
canvas.addEventListener('pointerdown',e=>{if(e.button===0&&!popupOpen()&&state==='landed'&&active&&hit(e,active)){suppressClick=false;drag={id:e.pointerId,x:e.clientX,yaw:active.rotation.y,moved:false};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.preventDefault();}});
let lastPointer=null;
function updateHover(){
 if(!lastPointer||drag)return;
 const e=lastPointer,rect=canvas.getBoundingClientRect();
 const inside=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
 const blocked=popupOpen()||document.elementFromPoint(e.clientX,e.clientY)?.closest('button,a,dialog');
 hover=Boolean(inside&&!blocked&&(state==='idle'||state==='landed')&&hit(e));
 hoverToy=Boolean(inside&&!blocked&&state==='landed'&&active&&hit(e,active));
 canvas.style.cursor=hoverToy?'grab':hover?'pointer':'default';
}
window.addEventListener('pointermove',e=>{
 lastPointer={clientX:e.clientX,clientY:e.clientY};
 if(drag&&e.pointerId===drag.id){if(Math.abs(e.clientX-drag.x)>4)drag.moved=true;active.rotation.y=drag.yaw+(e.clientX-drag.x)*.012;return;}
 updateHover();
},{capture:true});
window.addEventListener('blur',()=>{lastPointer=null;hover=false;hoverToy=false;});

function stopDrag(e){if(drag&&e.pointerId===drag.id){suppressClick=drag.moved;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);canvas.style.cursor='grab';}}
canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('lostpointercapture',()=>drag=null);
canvas.addEventListener('pointerleave',()=>{if(!drag){lastPointer=null;hover=false;hoverToy=false;}});
canvas.addEventListener('click',e=>{
 if(suppressClick){suppressClick=false;return;}if(popupOpen())return;
 if(state==='landed'&&active&&hit(e,active)){menu.open(active.userData.sceneName,active.children[0]);return;}
 if((state==='idle'||state==='landed')&&hit(e))open();
});
window.addEventListener('keydown',event=>{
 if(popupOpen())return;
 if(event.code!=='Space'||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
 event.preventDefault();
 if(!event.repeat)open();
});

const LID_SECONDS=.48, CLOSE_SECONDS=1.4;
function setLidPose(opening,closing=false){
 bendLid(.40*ease(opening/.16)*(1-ease((opening-.28)/.20)));
 tab.rotation.x=-ease((opening-.16)/(closing?.12:.18))*Math.PI*.52;
 // Lift while the tab unfolds, retaining the initial bow for wall clearance.
 hinge.rotation.x=-ease((opening-(closing?.28:.10))/(closing?.20:.38))*Math.PI*.5;
}
let transfer=null;
function startTransfer(now){
 active.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
 const center=new THREE.Box3().setFromObject(active,true).getCenter(new THREE.Vector3());
 const projected=center.clone().project(camera);
 const model=clone(active);model.position.set(0,0,0);model.visible=true;model.updateMatrixWorld(true);
 const localCenter=new THREE.Box3().setFromObject(model,true).getCenter(new THREE.Vector3());model.position.sub(localCenter);
 const flying=new THREE.Group();flying.add(model);scene.add(flying);
 const materials=[];model.traverse(n=>{if(n.isMesh){n.renderOrder=1000;n.castShadow=false;n.material=[n.material].flat().map(m=>{const c=m.clone();c.depthTest=false;c.depthWrite=false;materials.push(c);return c;});if(n.material.length===1)n.material=n.material[0];}});
 transfer={flying,materials,start:now,point:projected};active.visible=false;
}
function animateTransfer(now){
 if(!transfer)return;
 const {flying,point,materials}=transfer,t=Math.min(1,(now-transfer.start)/1.8),u=1-t;
 const rect=canvas.getBoundingClientRect(),button=collectionButton.getBoundingClientRect();
 const x0=(point.x+1)*rect.width/2,y0=(1-point.y)*rect.height/2;
 const x3=button.left+button.width/2-rect.left,y3=button.top+button.height/2-rect.top;
 const x1=Math.min(rect.width-30,x0+rect.width*.23),y1=Math.max(20,y0-rect.height*.52);
 const x2=x3+rect.width*.32,y2=Math.max(20,y0-rect.height*.4);
 const x=u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3;
 const y=u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3;
 flying.position.copy(new THREE.Vector3(x/rect.width*2-1,1-y/rect.height*2,point.z).unproject(camera));
 flying.scale.setScalar(Math.max(.005,Math.pow(1-t,1.3)));
 if(t===1){scene.remove(flying);materials.forEach(m=>m.dispose());flying.traverse(n=>n.skeleton?.dispose());transfer=null;}
}
function beginOpening(now){
 for(const f of figures)f.visible=false;
 active=figures[Math.floor(Math.random()*figures.length)];
 setLidPose(0);state='opening';start=now;
}
function open(){
 if(popupOpen()||(state!=='idle'&&state!=='landed'))return;
 status.textContent='';hover=false;hoverToy=false;canvas.style.cursor='default';
 const now=performance.now()/1000;
 if(state==='landed'){startTransfer(now);state='closing';start=now;}
 else beginOpening(now);
}
function animate(ms){if(stopped)return;const t=ms/1000;updateHover();box.position.set(BOX_X,boxSeat,.4);box.rotation.set(0,BOX_YAW,0);
 if(state==='landed'&&hover){box.rotation.z=Math.sin(t*70)*.012;box.position.x+=Math.sin(t*91)*.008;}
 if(state==='idle'){hinge.rotation.x=0;tab.rotation.x=0;bendLid(0);if(hover){box.rotation.z=Math.sin(t*70)*.012;box.position.x+=Math.sin(t*91)*.008;}}
 if(state==='closing'){
  const elapsed=t-start;
  // Reverse the clearance sequence: lower the lid, fold the tab inward,
  // then release the bow to seat the tab behind the front wall.
  setLidPose(LID_SECONDS*Math.max(0,1-elapsed/CLOSE_SECONDS),true);
  if(elapsed>=1.85)beginOpening(t);
 }
 if(state==='opening'){
  const elapsed=t-start,pose=lootPose(elapsed-LID_SECONDS),charge=Math.min(1,elapsed/SHAKE_SECONDS);
  if(elapsed<SHAKE_SECONDS){const amount=.008+.085*charge*charge;box.position.x+=Math.sin(t*(50+charge*60))*amount;box.rotation.z=Math.sin(t*83)*amount;box.position.y=boxSeat+Math.abs(Math.sin(t*65))*amount*.4;}
  const opening=elapsed-SHAKE_SECONDS;
  // Launch immediately, carrying the final shake into the airborne motion.
  const hopDuration=.56, rockDuration=.78;
  if(opening>=0&&opening<hopDuration){
   const phase=opening/hopDuration;
   // Two complete lateral cycles, synchronized to flight rather than frame time.
   const sway=Math.sin(phase*Math.PI*4)*.0465*(1-.45*phase);
   box.position.x+=sway;
   box.rotation.z=sway;
   // Higher arc over a shorter flight gives a sharper launch and landing.
   box.position.y=boxSeat+.45*4*phase*(1-phase)+.8*BOX_SCALE*Math.abs(Math.sin(box.rotation.z));
  }else if(opening>=hopDuration&&opening<hopDuration+rockDuration){
   const landing=opening-hopDuration;
   const decay=Math.pow(1-landing/rockDuration,2);
   const tilt=Math.sin(landing*22)*.10*decay;
   box.rotation.z=tilt;
   // Raise the base around its alternating bottom edges so neither wall sinks into the shelf.
   box.position.y=boxSeat+.8*BOX_SCALE*Math.abs(Math.sin(tilt));
  }
  // Raise the entire tucked tab above the front wall before unfolding it.
  setLidPose(opening);
  active.visible=elapsed>=SHAKE_SECONDS+LID_SECONDS;
  active.position.set(BOX_X+(TOY_X-BOX_X)*pose.flight,pose.y*.56+boxSeat*(1-pose.flight)+toySeat*pose.flight,pose.z*.12+.4);
  active.rotation.set(pose.wobble,Math.sin(pose.flight*Math.PI)*Math.PI*.8,pose.wobble*.65);
  if(pose.flight===1)toySpotlight.visible=true;
  if(pose.done){state='landed';active.position.set(TOY_X,toySeat,.562);active.rotation.set(0,0,0);status.textContent='';counts[active.userData.id]++;try{localStorage.setItem(collectionKey,JSON.stringify(counts));}catch{}updateCollection();}
 }
 animateTransfer(t);
 rendering.sceneChanged();rendering.render(camera,popupOpen()?null:hoverToy?active:hover?box:null);menu?.render(false);canvas.dataset.state=state;raf=requestAnimationFrame(animate);
}
try{
 const asset=await new GLTFLoader().loadAsync(new URL('../pieces/Buddyologies/Buddyologies box.glb',import.meta.url).href);
 box.add(asset.scene);hinge=asset.scene.getObjectByName('Lidhinge')||asset.scene.getObjectByName('Lid_hinge')||asset.scene.getObjectByName('Lid hinge');
 tab=asset.scene.getObjectByName('Fronttab')||asset.scene.getObjectByName('Front_tab')||asset.scene.getObjectByName('Front tab');
 lid=asset.scene.getObjectByName('Lidpanel')||asset.scene.getObjectByName('Lid_panel')||asset.scene.getObjectByName('Lid panel');
 if(!hinge||!tab||!lid)throw Error('Box lid or front tab missing');
 lidRest=[];lid.traverse(mesh=>{if(mesh.isMesh){mesh.geometry=mesh.geometry.clone();lidRest.push({mesh,rest:mesh.geometry.attributes.position.array.slice()});}});
 asset.scene.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;for(const material of [n.material].flat())if(material.map)material.map.anisotropy=rendering.renderer.capabilities.getMaxAnisotropy();}});
 const shelf=(await new GLTFLoader().loadAsync(new URL('../pieces/cabinet/shelf-light-2048.glb',import.meta.url).href)).scene;
 // Express the main room in the cabinet's local coordinates, then apply
 // the same enlargement and offset used by this shelf view.
 const cabinetConfig=sceneObjects.find(object=>object.name==='Cabinet');
 const roomConfig=sceneObjects.find(object=>object.name==='Room');
 const room=(await new GLTFLoader().loadAsync(new URL('../'+roomConfig.file,import.meta.url).href)).scene;
 room.position.fromArray(roomConfig.position);room.rotation.fromArray([...roomConfig.rotation,'XYZ']);room.scale.setScalar(roomConfig.scale);
 const cabinetTransform=new THREE.Matrix4().compose(
  new THREE.Vector3(...cabinetConfig.position),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(...cabinetConfig.rotation)),
  new THREE.Vector3().setScalar(cabinetConfig.scale)
 );
 const roomFrame=new THREE.Group();roomFrame.applyMatrix4(cabinetTransform.invert());roomFrame.add(room);
 const surroundings=new THREE.Group();surroundings.scale.setScalar(10);surroundings.position.set(0,-7,0);surroundings.add(roomFrame);scene.add(surroundings);
 room.traverse(node=>{if(node.isMesh){node.receiveShadow=true;node.castShadow=true;}});
 shelf.scale.setScalar(10);shelf.position.set(0,-7,0);shelf.traverse(n=>{if(n.isMesh){
  n.receiveShadow=true;n.castShadow=true;
  // Lift the scanned wood locally without adding illumination to the walls.
  const brighten=source=>{const material=source.clone();material.emissive.set(0xffead0);material.emissiveMap=material.map;material.emissiveIntensity=.22;
   // The scan includes a pale wall fringe beyond the right wooden upright.
   // Mask only neutral wall texels there; keep the irregular wood silhouette.
   material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 shelfScanPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nshelfScanPosition=position;');
    shader.fragmentShader='varying vec3 shelfScanPosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     if(shelfScanPosition.x>.28 && shelfScanPosition.y<1.6){
      vec3 scan=diffuseColor.rgb;
      if(scan.g>scan.r*.76 && scan.b>scan.r*.60) discard;
     }`);
   };
   material.customProgramCacheKey=()=> 'shelf-wall-fringe-v1';
   return material;};
  n.material=Array.isArray(n.material)?n.material.map(brighten):brighten(n.material);
 }});scene.add(shelf);shelf.updateMatrixWorld(true);
 function surface(x,z){const cast=new THREE.Raycaster(new THREE.Vector3(x,1,z),new THREE.Vector3(0,-1,0));return cast.intersectObject(shelf,true)[0]?.point.y??0;}
 boxSeat=surface(BOX_X,.4);toySeat=surface(TOY_X,.562);
 toySpotlight.position.set(TOY_X-.35,toySeat+2.6,3.2);
 toySpotlight.target.position.set(TOY_X,toySeat+.45,.562);

 const records=await(await fetch('../../pieces/pieces.json')).json();const loader=new GLTFLoader();figureRecords=records.filter(p=>figureIds.includes(p.id));
 await refreshOrientations();menu=createMenu({pieces:createPieceCatalog(records),signal:menuController.signal,invalidate:()=>{},onChange:()=>{hover=false;hoverToy=false;}});updateCollection();
 await Promise.all(['luigi','crooks','tetsuya','rittenhouse'].map(async id=>{const record=records.find(r=>r.id===id);const gltf=await loader.loadAsync(new URL('../'+record.assets[0],import.meta.url).href);const object=gltf.scene;object.name=record.sceneName||record.name;object.rotation.set(...previewOrientations[record.sceneName||record.name]);object.updateMatrixWorld(true);let bounds=new THREE.Box3().setFromObject(object,true);const size=bounds.getSize(new THREE.Vector3());object.scale.multiplyScalar(TOY_HEIGHT/size.y);object.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(object,true);const center=bounds.getCenter(new THREE.Vector3());object.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));object.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});const pivot=new THREE.Group();pivot.add(object);pivot.userData.name=record.name;pivot.userData.id=id;pivot.userData.sceneName=record.sceneName||record.name;pivot.visible=false;scene.add(pivot);figures.push(pivot);}));
 state='idle';status.textContent='';window.siteLoading?.finish();raf=requestAnimationFrame(animate);
}catch(error){console.error(error);status.textContent='Unable to load the box. Reload to try again.';window.siteLoading?.fail(status.textContent);}
window.addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(raf);disposeCollection();menuController.abort();menu?.dispose();rendering.dispose();});
