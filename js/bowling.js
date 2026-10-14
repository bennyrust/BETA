import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { frameComplete, scores, freshRack, rollLabel } from './bowling-score.js';
const $=id=>document.getElementById(id), canvas=$('lane');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#100b27');scene.fog=new THREE.Fog('#100b27',35,65);
const camera=new THREE.PerspectiveCamera(49,1,.1,100);camera.position.set(0,4.8,9);camera.lookAt(0,0,-12);
scene.add(new THREE.HemisphereLight(0xbacaff,0x54352a,.85));
const key=new THREE.DirectionalLight(0xffe6bd,1.0);key.position.set(-5,10,-4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-8,right:8,top:25,bottom:-25});scene.add(key);
function box(w,h,d,x,y,z,color,emissive){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.12,emissive:emissive||0}));if(h===.15){m.material.map=woodTexture;m.material.roughness=.24;}m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
const woodCanvas=document.createElement('canvas');woodCanvas.width=128;woodCanvas.height=512;const wood=woodCanvas.getContext('2d');wood.fillStyle='#ffffff';wood.fillRect(0,0,128,512);
for(let i=0;i<90;i++){wood.strokeStyle=`rgba(90,50,15,${.02+(i%5)*.009})`;wood.lineWidth=.4+(i%3)*.3;wood.beginPath();for(let y=0;y<=512;y+=8){const x=i*1.47+Math.sin(y*.009+i)*1.4; if(y===0)wood.moveTo(x,y);else wood.lineTo(x,y);}wood.stroke();}
const woodTexture=new THREE.CanvasTexture(woodCanvas);woodTexture.colorSpace=THREE.SRGBColorSpace;woodTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
// Maple boards, a single lane, recessed gutters and luminous rails.
box(30,.2,50,0,-.62,-12,0x19132a);
for(let j=0;j<30;j++)for(let i=0;i<12;i++){const z=3-j*.93;box(.332,.15,.925,(i-5.5)*.334,-.075,z,new THREE.Color().setHSL(.095,.45,.48+((i*17+j*7)%9)*.013));}
for(const x of [-2.3,2.3]){box(.6,.12,29,x,-.27,-10,0x171525);box(.08,.1,29,Math.sign(x)*2.65,-.05,-10,0x50e7ff,0x187d98);}
box(4,.01,.07,0,.01,2,0xffffff);box(6,4,.3,0,1.4,-26,0x25143e);
for(let i=0;i<7;i++){box(.06,3,.07,(i-3)*.83,1.4,-25.8,i%2?0xff42cf:0x42e5ff,i%2?0xaa1688:0x168aaa);}
const sign=document.createElement('canvas');sign.width=1024;sign.height=256;const ctx=sign.getContext('2d');ctx.fillStyle='#180e32';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle='#ffdc74';ctx.font='italic bold 84px Arial';ctx.fillText('PROFILO CONTINUO',512,110);ctx.fillStyle='#69efff';ctx.font='bold 40px Arial';ctx.fillText('★  BOWL-O-RAMA  ★',512,186);const signTex=new THREE.CanvasTexture(sign);signTex.colorSpace=THREE.SRGBColorSpace;const signage=new THREE.Mesh(new THREE.PlaneGeometry(6,1.5),new THREE.MeshBasicMaterial({map:signTex}));signage.position.set(0,3.8,-25.5);scene.add(signage);
const ball=new THREE.Group();const sphere=new THREE.Mesh(new THREE.SphereGeometry(.29,32,24),new THREE.MeshStandardMaterial({color:0x7e29d9,roughness:.17,metalness:.4}));sphere.castShadow=true;ball.add(sphere);for(const [x,z] of [[-.07,-.07],[.07,-.07],[0,.08]]){const hole=new THREE.Mesh(new THREE.SphereGeometry(.034,12,8),new THREE.MeshBasicMaterial({color:0x120721}));hole.position.set(x,.276,z);ball.add(hole);}scene.add(ball);
const guide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0x71ffff,dashSize:.35,gapSize:.24}));scene.add(guide);
let pins=[],frames=Array.from({length:10},()=>[]),frame=0,state='loading',power=0,chargeTime=0,flight=0,settle=0,velocity=new THREE.Vector2(),gutter=false,last=0,accumulator=0,aim=0;
let template;
function rack(){for(const p of pins)scene.remove(p.mesh);pins=[];for(let row=0;row<4;row++)for(let col=0;col<=row;col++){const mesh=template.clone(true);mesh.position.set((col-row/2)*.79,0,-19-row*.72);scene.add(mesh);pins.push({mesh,x:mesh.position.x,z:mesh.position.z,vx:0,vz:0,fall:0,down:false,axis:new THREE.Vector3(1,0,0)});}}
function hud(){const totals=scores(frames);$('scoreboard').innerHTML=frames.map((r,i)=>`<div class="frame ${i===frame?'active':''}"><b>${i+1}</b><div class="rolls">${r.map((_,n)=>rollLabel(r,n)).join(' ')}</div><div class="total">${totals[i]??''}</div></div>`).join('');$('turn').textContent=state==='over'?`FINAL SCORE · ${totals[9]}`:`Frame ${frame+1} · Ball ${frames[frame].length+1}`;$('aim').disabled=!['aim','charge'].includes(state);$('bowl').disabled=!['aim','charge'].includes(state);}
function powerUI(){ $('powerFill').style.width=`${power}%`;$('powerNeedle').style.left=`${power}%`;$('powerValue').value=Math.round(power);}
function lineUp(){ball.position.set(aim*1.5,.29,2.65);ball.rotation.set(0,0,0);guide.geometry.dispose();guide.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(aim*1.5,.025,2),new THREE.Vector3(aim*3.5,.025,-22)]);guide.computeLineDistances();}
function prepare(){state='aim';power=0;powerUI();ball.visible=true;guide.visible=true;lineUp();hud();}
function start(){if(state!=='aim')return;state='charge';chargeTime=0;power=0;$('callout').textContent='';}
function release(){if(state!=='charge')return;state='roll';guide.visible=false;const speed=6+power*.19;velocity.set(aim*2,-24.65).normalize().multiplyScalar(speed);flight=0;settle=0;gutter=false;hud();}
function knock(p,vx,vz,force){if(p.down)return;p.down=true;p.vx=vx*.57;p.vz=vz*.57;p.axis.set(vz,0,-vx).normalize();if(p.axis.lengthSq()<.1)p.axis.set(1,0,0);p.fall=Math.max(.025,force*.006);}
function step(dt){if(state!=='roll')return;flight+=dt;ball.position.x+=velocity.x*dt;ball.position.z+=velocity.y*dt;ball.rotation.x-=velocity.length()*dt/.29;
 if(Math.abs(ball.position.x)>2.03)gutter=true;
 if(gutter){ball.position.x=THREE.MathUtils.clamp(ball.position.x,-2.35,2.35);ball.position.y=Math.max(.02,ball.position.y-dt*2);velocity.x=0;}
 for(const p of pins){if(!p.down&&!gutter){const dx=p.x-ball.position.x,dz=p.z-ball.position.z,d=Math.hypot(dx,dz);if(d<.59){knock(p,velocity.x+dx*9,velocity.y+dz*5,velocity.length());velocity.multiplyScalar(.88);velocity.x-=dx*2;}}
 if(p.down){p.x+=p.vx*dt;p.z+=p.vz*dt;p.vx*=Math.exp(-2.3*dt);p.vz*=Math.exp(-2.3*dt);p.fall=Math.min(Math.PI/2,p.fall+dt*4.2);p.mesh.quaternion.setFromAxisAngle(p.axis,p.fall);p.mesh.position.set(p.x,Math.sin(p.fall)*.13,p.z);}}
 for(const a of pins)if(a.down)for(const b of pins)if(a!==b&&!b.down){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<.69&&Math.hypot(a.vx,a.vz)>.5)knock(b,a.vx+dx*5,a.vz+dz*5,3);}
 if(ball.position.z<-24||flight>7){settle+=dt;if(settle>1.4)finishRoll();}}
function announce(text){$('callout').textContent=text;$('callout').classList.remove('pop');void $('callout').offsetWidth;$('callout').classList.add('pop');}
function finishRoll(){state='result';const count=pins.filter(p=>p.down).length;frames[frame].push(count);const rolls=frames[frame];const label=rollLabel(rolls,rolls.length-1);announce(label==='X'?'STRIKE!':label==='/'?'SPARE!':count===0?'GUTTER BALL':`${count} PIN${count===1?'':'S'}!`);const complete=frameComplete(frame,rolls);const reset=freshRack(frame,rolls);for(const p of pins)if(p.down)scene.remove(p.mesh);pins=pins.filter(p=>!p.down);hud();settle=0;nextReset=reset;nextComplete=complete;}
let nextReset=false,nextComplete=false;
function advance(){if(nextComplete&&frame===9){state='over';announce(`GAME OVER · ${scores(frames)[9]}`);hud();ball.visible=false;return;}if(nextComplete)frame++;if(nextReset)rack();prepare();}
$('aim').addEventListener('input',e=>{if(state!=='aim')return;aim=+e.target.value;lineUp();});
canvas.addEventListener('pointermove',e=>{if(state==='aim'){aim=THREE.MathUtils.clamp((e.clientX/innerWidth-.5)*2,-1,1);$('aim').value=aim;lineUp();}});
for(const el of [canvas,$('bowl')])el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();el.setPointerCapture(e.pointerId);start();});
window.addEventListener('pointerup',release);window.addEventListener('pointercancel',()=>{if(state==='charge')prepare();});window.addEventListener('blur',()=>{if(state==='charge')prepare();});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','A'].includes(document.activeElement.tagName)){e.preventDefault();if(!e.repeat)start();}if(state==='aim'&&['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();aim=THREE.MathUtils.clamp(aim+(e.code==='ArrowLeft'?-.025:.025),-1,1);$('aim').value=aim;lineUp();}});window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();release();}});
$('restart').addEventListener('click',()=>{if(!template)return;frames=Array.from({length:10},()=>[]);frame=0;rack();$('callout').textContent='';prepare();});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
function animate(t){const dt=Math.min((t-last)/1000||0,.05);last=t;if(state==='charge'){chargeTime+=dt;power=(1-Math.cos(chargeTime*Math.PI*1.4))*50;powerUI();}if(state==='result'){settle+=dt;if(settle>1.65)advance();}accumulator+=dt;while(accumulator>=1/120){step(1/120);accumulator-=1/120;}renderer.render(scene,camera);}renderer.setAnimationLoop(animate);
try{const gltf=await new GLTFLoader().loadAsync('../trump/Trump-2048.glb');const model=gltf.scene;model.updateMatrixWorld(true);model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const scale=Math.min(1.05/size.y,.66/Math.max(size.x,size.z));model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);template=new THREE.Group();template.add(model);rack();prepare();window.siteLoading?.finish();}catch(error){console.error(error);window.siteLoading?.fail('Could not load Profilo Continuo. Please retry.');}
window.addEventListener('pagehide',()=>renderer.setAnimationLoop(null));window.addEventListener('pageshow',()=>{last=0;renderer.setAnimationLoop(animate);});
