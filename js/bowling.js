import {runtimeAsset} from './runtime-assets.js';
import {awardGame} from './economy.js';
import {notify,inventoryOpen} from './economy-ui.js';
let economySession=crypto.randomUUID();
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BowlingPhysics, DIM } from './bowling-physics.js';
import { frameComplete, scores, freshRack, rollLabel } from './bowling-score.js';
const $=id=>document.getElementById(id), canvas=$('lane');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const scene=new THREE.Scene();scene.background=new THREE.Color('#100b27');scene.fog=new THREE.Fog('#100b27',35,65);
const camera=new THREE.PerspectiveCamera(49,1,.1,100);camera.position.set(0,1.6,3.5);camera.lookAt(0,.12,-3);
scene.add(new THREE.HemisphereLight(0xbacaff,0x54352a,.85));
const key=new THREE.DirectionalLight(0xffe6bd,1.0);key.position.set(-5,10,-4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.004;key.shadow.bias=-.0001;Object.assign(key.shadow.camera,{left:-8,right:8,top:25,bottom:-25});scene.add(key);
function box(w,h,d,x,y,z,color,emissive){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.12,emissive:emissive||0}));if(h===.15){m.material.map=woodTexture;m.material.roughness=.24;}m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
const woodCanvas=document.createElement('canvas');woodCanvas.width=128;woodCanvas.height=512;const wood=woodCanvas.getContext('2d');wood.fillStyle='#ffffff';wood.fillRect(0,0,128,512);
for(let i=0;i<90;i++){wood.strokeStyle=`rgba(90,50,15,${.02+(i%5)*.009})`;wood.lineWidth=.4+(i%3)*.3;wood.beginPath();for(let y=0;y<=512;y+=8){const x=i*1.47+Math.sin(y*.009+i)*1.4; if(y===0)wood.moveTo(x,y);else wood.lineTo(x,y);}wood.stroke();}
const woodTexture=new THREE.CanvasTexture(woodCanvas);woodTexture.colorSpace=THREE.SRGBColorSpace;woodTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
// Regulation lane: 39 boards, foul line at z=0, headpin at -18.288 metres.
box(8,.2,28,0,-.4,-9,0x19132a);
const boardWidth=DIM.width/39;
const boards=new THREE.InstancedMesh(new THREE.BoxGeometry(boardWidth-.0005,.15,DIM.deck/20-.002),new THREE.MeshStandardMaterial({map:woodTexture,roughness:.24,metalness:.12}),780);const boardMatrix=new THREE.Matrix4();
for(let j=0;j<20;j++)for(let i=0;i<39;i++){const n=j*39+i;boardMatrix.makeTranslation((i-19)*boardWidth,-.075,-(j+.5)*DIM.deck/20);boards.setMatrixAt(n,boardMatrix);boards.setColorAt(n,new THREE.Color().setHSL(.095,.45,.48+((i*17+j*7)%9)*.013));}boards.receiveShadow=true;scene.add(boards);

box(1.8,.15,4.572,0,-.075,2.286,0xb98547);
for(const side of [-1,1]){const x=side*(DIM.width+DIM.gutter)/2;box(DIM.gutter,.1,DIM.deck,x,-.19,-DIM.deck/2,0x171525);box(.025,.05,DIM.deck,side*(DIM.width/2+DIM.gutter),.005,-DIM.deck/2,0x50e7ff,0x187d98);}
box(DIM.width,.006,.02,0,.004,0,0x30243f);box(2.2,1.8,.15,0,.8,-20.2,0x25143e);
for(let i=0;i<7;i++)box(.02,1.7,.03,(i-3)*.28,.85,-20.1,i%2?0xff42cf:0x42e5ff,i%2?0xaa1688:0x168aaa);
// Target arrows at fifteen feet; the guide stops here rather than predicting a strike.
for(let i=-3;i<=3;i++){const shape=new THREE.Shape();shape.moveTo(-.015,0);shape.lineTo(0,.065);shape.lineTo(.015,0);const arrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x34271c,side:THREE.DoubleSide}));arrow.rotation.x=-Math.PI/2;arrow.position.set(i*boardWidth*5,.006,-4.572+Math.abs(i)*.12);scene.add(arrow);}
const sign=document.createElement('canvas');sign.width=1024;sign.height=256;const ctx=sign.getContext('2d');ctx.fillStyle='#180e32';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle='#ffdc74';ctx.font='italic bold 84px Arial';ctx.fillText('PROFILO CONTINUO',512,110);ctx.fillStyle='#69efff';ctx.font='bold 40px Arial';ctx.fillText('★  BOWL-O-RAMA  ★',512,186);const signTex=new THREE.CanvasTexture(sign);signTex.colorSpace=THREE.SRGBColorSpace;const signage=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.6),new THREE.MeshBasicMaterial({map:signTex}));signage.position.set(0,2.1,-20);scene.add(signage);
const ball=new THREE.Group();const sphere=new THREE.Mesh(new THREE.SphereGeometry(DIM.ballRadius,32,24),new THREE.MeshStandardMaterial({color:0x7e29d9,roughness:.17,metalness:.4}));sphere.castShadow=true;ball.add(sphere);for(const [x,z] of [[-.026,-.026],[.026,-.026],[0,.03]]){const hole=new THREE.Mesh(new THREE.SphereGeometry(.012,12,8),new THREE.MeshBasicMaterial({color:0x120721}));hole.position.set(x,.102,z);ball.add(hole);}scene.add(ball);
const guide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0x71ffff,dashSize:.35,gapSize:.24}));scene.add(guide);
let pins=[],frames=Array.from({length:10},()=>[]),frame=0,state='loading',power=0,chargeTime=0,settle=0,last=0,accumulator=0,aim=0,position=0,spin=0;
let template,physics;
function rack(){for(const p of pins)scene.remove(p.mesh);physics.rack();pins=physics.pins.map(p=>{const mesh=template.clone(true);scene.add(mesh);return {...p,mesh};});syncPins();}
function syncPins(){renderer.shadowMap.needsUpdate=true;for(const p of pins){p.mesh.position.copy(p.body.position);p.mesh.quaternion.copy(p.body.quaternion);}}
function hud(){const totals=scores(frames);$('scoreboard').innerHTML=frames.map((r,i)=>`<div class="frame ${i===frame?'active':''}"><b>${i+1}</b><div class="rolls">${r.map((_,n)=>rollLabel(r,n)).join(' ')}</div><div class="total">${totals[i]??''}</div></div>`).join('');$('turn').textContent=state==='over'?`FINAL SCORE · ${totals[9]}`:`Frame ${frame+1} · Ball ${frames[frame].length+1}`;for(const id of ['aim','position','spin'])$(id).disabled=state!=='aim';$('bowl').disabled=!['aim','charge'].includes(state);}
function powerUI(){ $('powerFill').style.width=`${power}%`;$('powerNeedle').style.left=`${power}%`;$('powerValue').value=Math.round(power);}
function lineUp(){ball.position.set(position,DIM.ballRadius,-.15);ball.rotation.set(0,0,0);renderer.shadowMap.needsUpdate=true;guide.geometry.dispose();const angle=aim*Math.PI/180;guide.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(position,.012,-.15),new THREE.Vector3(position+Math.tan(angle)*4.4,.012,-4.55)]);guide.computeLineDistances();}
function prepare(){state='aim';power=0;accumulator=0;powerUI();ball.visible=true;guide.visible=true;lineUp();hud();}
function start(){if(inventoryOpen())return;if(state!=='aim')return;state='charge';chargeTime=0;power=0;$('callout').textContent='';hud();}
function release(){if(state!=='charge')return;state='roll';guide.visible=false;physics.launch({position,angle:aim,spin,power});settle=0;hud();}
function step(dt){if(state!=='roll')return;physics.step(dt);ball.position.copy(physics.ball.position);ball.quaternion.copy(physics.ball.quaternion);syncPins();if(physics.done)finishRoll();}
function announce(text){$('callout').textContent=text;$('callout').classList.remove('pop');void $('callout').offsetWidth;$('callout').classList.add('pop');}
function finishRoll(){state='result';const count=physics.count();frames[frame].push(count);const rolls=frames[frame];const label=rollLabel(rolls,rolls.length-1);announce(label==='X'?'STRIKE!':label==='/'?'SPARE!':count===0?(physics.gutter?'GUTTER BALL':'MISS'):`${count} PIN${count===1?'':'S'}!`);const complete=frameComplete(frame,rolls);const reset=freshRack(frame,rolls);const fallen=new Set(physics.sweep());for(const p of pins)if(fallen.has(p.id))scene.remove(p.mesh);pins=pins.filter(p=>!fallen.has(p.id));hud();settle=0;nextReset=reset;nextComplete=complete;}
let nextReset=false,nextComplete=false;
function advance(){if(nextComplete&&frame===9){state='over';awardGame(economySession,'bowling',scores(frames)[9]).then(n=>notify(`Game complete: +${n} coins`)).catch(e=>notify(e.message));announce(`GAME OVER · ${scores(frames)[9]}`);hud();ball.visible=false;return;}if(nextComplete)frame++;if(nextReset)rack();prepare();}
for(const id of ['aim','position','spin'])$(id).addEventListener('input',e=>{if(state!=='aim')return;if(id==='aim')aim=+e.target.value;if(id==='position')position=+e.target.value;if(id==='spin')spin=+e.target.value;lineUp();});
canvas.addEventListener('pointermove',e=>{if(state==='aim'){aim=THREE.MathUtils.clamp((e.clientX/innerWidth-.5)*8,-4,4);$('aim').value=aim;lineUp();}});
for(const el of [canvas,$('bowl')])el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();el.setPointerCapture(e.pointerId);start();});
window.addEventListener('pointerup',release);window.addEventListener('pointercancel',()=>{if(state==='charge')prepare();});window.addEventListener('blur',()=>{if(state==='charge')prepare();});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','A'].includes(document.activeElement.tagName)){e.preventDefault();if(!e.repeat)start();}if(state==='aim'&&document.activeElement.tagName!=='INPUT'&&['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();aim=THREE.MathUtils.clamp(aim+(e.code==='ArrowLeft'?-.05:.05),-4,4);$('aim').value=aim;lineUp();}});window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();release();}});
$('restart').addEventListener('click',()=>{if(!template)return;economySession=crypto.randomUUID();frames=Array.from({length:10},()=>[]);frame=0;rack();$('callout').textContent='';prepare();});
function resize(){const reserved=innerWidth<850?document.getElementById('controls').getBoundingClientRect().height+24:0;const viewHeight=Math.max(180,innerHeight-reserved);renderer.setSize(innerWidth,innerHeight,false);renderer.setViewport(0,innerHeight-viewHeight,innerWidth,viewHeight);camera.aspect=innerWidth/viewHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
function animate(t){if(inventoryOpen()){last=t;return;}const dt=Math.min((t-last)/1000||0,.05);last=t;if(state==='charge'){chargeTime+=dt;power=(1-Math.cos(chargeTime*Math.PI*1.4))*50;powerUI();}if(state==='result'){settle+=dt;if(settle>1.65)advance();}accumulator=Math.min(accumulator+dt,4/240);while(accumulator>=1/240){step(1/240);accumulator-=1/240;}const rolling=state==='roll'||state==='result';const follow=rolling?Math.min(14,Math.max(0,-ball.position.z-3)):0;camera.position.lerp(new THREE.Vector3(0,1.6-follow*.025,3.5-follow),1-Math.exp(-dt*3));camera.lookAt(0,.12,-3-15.5*follow/14);renderer.render(scene,camera);}renderer.setAnimationLoop(animate);
try{const gltf=await new GLTFLoader().loadAsync(runtimeAsset('../trump/Trump-bowling.glb'));const model=gltf.scene;model.updateMatrixWorld(true);model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());physics=new BowlingPhysics({pinHeight:size.y,pinWidth:Math.max(size.x,size.z)});model.position.x-=center.x;model.position.y-=bounds.min.y+physics.pinCOM;model.position.z-=center.z;template=new THREE.Group();template.add(model);rack();prepare();window.siteLoading?.finish();}catch(error){console.error(error);window.siteLoading?.fail('Could not load Profilo Continuo. Please retry.');}
window.addEventListener('pagehide',()=>renderer.setAnimationLoop(null));window.addEventListener('pageshow',()=>{last=0;renderer.setAnimationLoop(animate);});

window.addEventListener('inventorytoggle',e=>{if(e.detail&&state==='charge')prepare();});
