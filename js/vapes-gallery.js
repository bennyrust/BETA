import { varyVape } from './vape-variation.js';
import * as THREE from 'three';
import { wrapIndex, loopOffset } from './selector-math.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mountPieceFiles } from './piece-files.js';
import { loadPieceCatalog } from './pieces.js';
const stage=document.getElementById('selectorStage'),title=document.getElementById('flavorTitle'),description=document.getElementById('flavorDescription'),status=document.getElementById('selectorStatus');
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:true});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;stage.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,100);camera.position.set(0,.1,6.5);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x686868,1.4));const key=new THREE.DirectionalLight(0xffffff,1.6);key.position.set(2,4,5);scene.add(key);
const models=[],records=[];let target=0,current=0,frame=0,drag=null,ready=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const wrap=n=>wrapIndex(n,records.length);
function draw(){frame=0;current=reduced.matches?target:THREE.MathUtils.lerp(current,target,.15);if(Math.abs(target-current)<.001)current=target;
 models.forEach((model,i)=>{const d=loopOffset(i,current,records.length);model.visible=Math.abs(d)<2.65;model.position.set(d*.90,-Math.min(Math.abs(d),2)*.13,-Math.abs(d)*1.25);model.scale.setScalar(1-Math.min(Math.abs(d),2)*.12);});
 renderer.render(scene,camera);if(current!==target)invalidate();}
function invalidate(){if(!frame)frame=requestAnimationFrame(draw);}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(Math.max(1,Math.round(w)),Math.max(1,Math.round(h)),false);renderer.domElement.style.width=w+'px';renderer.domElement.style.height=h+'px';camera.aspect=w/h;camera.position.z=5.2;camera.updateProjectionMatrix();invalidate();}
new ResizeObserver(resize).observe(stage);
const viewport=document.querySelector('.selectorViewport');
new ResizeObserver(()=>{document.querySelector('.selector').style.setProperty('--selector-scale',Math.min(viewport.clientWidth/1280,viewport.clientHeight/720));}).observe(viewport);
function select(index){if(!ready)return;target=index;const i=wrap(index),piece=records[i];title.textContent=piece.name.replace(/ vape$/i,'');description.textContent=piece.definition||'';document.querySelectorAll('.flavorTick').forEach((b,n)=>{b.setAttribute('aria-pressed',String(n===i));});invalidate();}
document.getElementById('previousVape').onclick=()=>select(target-1);document.getElementById('nextVape').onclick=()=>select(target+1);
// Match the on-screen A/B actions, regardless of selector focus.
document.addEventListener('keydown', event => {
 if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
 if (event.target instanceof Element && (event.target.isContentEditable || event.target.closest('input, textarea, select'))) return;
 const selector = { a: '#buyVape', b: '.backControl' }[event.key.toLowerCase()];
 if (!selector) return;
 const link = document.querySelector(selector);
 if (link) { event.preventDefault(); link.click(); }
});
document.getElementById('turnVape').onclick=()=>{if(!ready)return;models[wrap(target)].children[0].rotation.y+=Math.PI/6;invalidate();};
stage.tabIndex=0;stage.setAttribute('aria-label','Vape selector. Left and right arrows select; up and down turn the selected model.');
stage.addEventListener('keydown',e=>{if(!ready)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')select(target-1);if(e.key==='ArrowRight')select(target+1);if(e.key==='Home')select(0);if(['ArrowUp','ArrowDown'].includes(e.key)){models[wrap(target)].children[0].rotation.y+=(e.key==='ArrowUp'?1:-1)*Math.PI/6;invalidate();}});
let wheelAt=0;stage.addEventListener('wheel',e=>{if(!ready)return;e.preventDefault();const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(Math.abs(delta)>4&&performance.now()-wheelAt>180){select(target+Math.sign(delta));wheelAt=performance.now();}},{passive:false});
const canvas=renderer.domElement;canvas.style.touchAction='none';
canvas.addEventListener('pointerdown',e=>{if(!ready||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>25)select(target-Math.sign(dx));else{const rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(models.filter(m=>m.visible),true)[0];if(hit){let root=hit.object;while(root.parent!==scene)root=root.parent;const index=models.indexOf(root);let step=wrap(index-wrap(target));if(step>records.length/2)step-=records.length;select(target+step);}}drag=null;});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
try{
 records.push(...[...new Set((await loadPieceCatalog()).values())].filter(p=>p.pageId==='vapes'&&p.id!=='vapes'));
 if(records.length!==12)throw new Error('Expected all 12 flavor records');
 const loader=new GLTFLoader();
 for(const [i,piece] of records.entries()){
  status.textContent=`Loading collection ${i+1} / ${records.length}`;
  const {scene:asset}=await loader.loadAsync(new URL('../'+piece.assets[0],import.meta.url).href);
  varyVape(asset,piece.assets[0]);
  // Preserve the GLB's authored transforms. Normalize via wrapper groups only.
  const box=new THREE.Box3().setFromObject(asset),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const placement=new THREE.Group(),turn=new THREE.Group(),centered=new THREE.Group();centered.add(asset);centered.position.copy(center).negate();turn.add(centered);turn.scale.setScalar(2.6/size.y);placement.add(turn);scene.add(placement);models.push(placement);
  const tick=document.createElement('button');tick.className='flavorTick';tick.textContent=String(i+1).padStart(2,'0');tick.setAttribute('aria-label',piece.name);tick.onclick=()=>{let step=wrap(i-wrap(target));if(step>6)step-=12;select(target+step);};document.getElementById('flavorTicks').append(tick);
 }
 await document.fonts.load('26px Battlefront');ready=true;document.getElementById('turnVape').disabled=false;status.hidden=true;select(0);resize();window.siteLoading?.finish();
}catch(error){console.error(error);status.textContent='Collection could not load. Reload to retry.';window.siteLoading?.fail(status.textContent);}
window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));

mountPieceFiles('vapes','vapes',document.getElementById('vapeLibrary'));

let refreshing=false;
setInterval(async()=>{if(document.hidden||!ready||refreshing)return;refreshing=true;try{const latest=[...new Set((await loadPieceCatalog()).values())];for(const record of records){const update=latest.find(p=>p.id===record.id);if(update)Object.assign(record,update);}select(target);}catch(error){console.warn('Definitions could not refresh',error);}finally{refreshing=false;}},1500);
