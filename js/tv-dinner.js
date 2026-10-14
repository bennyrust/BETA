import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sceneObjects } from './config.js';
const host=document.getElementById('installation'),status=document.getElementById('installationStatus');
const video=document.getElementById('dinnerVideo'),play=document.getElementById('playVideo'),mute=document.getElementById('muteVideo'),seek=document.getElementById('videoSeek');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('white');
const camera=new THREE.PerspectiveCamera(40,1,.01,500);
scene.add(new THREE.HemisphereLight(0xffffff,0x777777,1.3));const light=new THREE.DirectionalLight(0xffffff,1.4);light.position.set(3,5,6);scene.add(light);
const pivot=new THREE.Group(),arrangement=new THREE.Group();pivot.add(arrangement);scene.add(pivot);
const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
const screen=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));screen.position.z=-50;screen.visible=false;scene.add(screen);
let zoom=.5;
let radius=1,ready=false,frame=0,drag=null,yaw=0,pitch=0;
// Three.js uses Y for the upright axis. Stop at either side of the front-facing view.
function setRotation(nextYaw,nextPitch){yaw=THREE.MathUtils.clamp(nextYaw,-Math.PI/2,Math.PI/2);pitch=THREE.MathUtils.clamp(nextPitch,0,Math.PI/2);pivot.rotation.set(pitch,yaw,0,'XYZ');updateCamera();invalidate();}
function render(){frame=0;renderer.render(scene,camera);if(!video.paused&&!video.ended)frame=requestAnimationFrame(render);}
function invalidate(){if(!frame)frame=requestAnimationFrame(render);}
function updateCamera(){
 const tangent=Math.tan(THREE.MathUtils.degToRad(20));
 const angle=Math.min(THREE.MathUtils.degToRad(20),Math.atan(tangent*camera.aspect));
 const baseDistance=radius/Math.sin(angle)*1.35;
 const activeZoom=pivot.visible?zoom:.5;
 camera.position.set(0,0,baseDistance/(Math.min(activeZoom,.5)/.5));
 const tv=arrangement.getObjectByName('GTA with Stand');
 if(tv){pivot.updateWorldMatrix(true,true);const focus=new THREE.Box3().setFromObject(tv,true).getCenter(new THREE.Vector3());camera.position.x=focus.x;camera.position.y=focus.y;}
 if(tv&&activeZoom>.5){
  pivot.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(tv,true),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  // Fit the floating monitor into the reference's large central rectangle.
  const distance=Math.max(size.y/(2*tangent*.82),size.x/(2*tangent*camera.aspect*.84))+size.z/2;
  const progress=THREE.MathUtils.clamp((activeZoom-.5)/1.5,0,1);
  const blend=progress*progress*(3-2*progress);
  camera.position.lerp(new THREE.Vector3(center.x,center.y,center.z+distance),blend);
 }
 // Parallel camera translation centers the monitor without tilting the view.
 camera.lookAt(camera.position.x,camera.position.y,camera.position.z-1);
 const depth=camera.position.z-screen.position.z;
 const height=2*depth*tangent*.78,aspect=video.videoWidth/video.videoHeight||16/9;
 const width=Math.min(height*aspect,2*depth*tangent*camera.aspect*.92);
 screen.position.x=camera.position.x;screen.position.y=camera.position.y;
 screen.scale.set(width,width/aspect,1);
}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();updateCamera();invalidate();}
new ResizeObserver(resize).observe(host);
video.src=new URL('../pieces/white-tv/TV Dinner.mp4',import.meta.url).href;video.muted=false;video.volume=1;
video.addEventListener('loadedmetadata',()=>{seek.max=video.duration||0;resize();});video.addEventListener('loadeddata',()=>{screen.visible=true;invalidate();});video.addEventListener('seeked',invalidate);
video.addEventListener('timeupdate',()=>{seek.value=video.currentTime;});
video.addEventListener('play',()=>{play.textContent='Pause';invalidate();});video.addEventListener('pause',()=>{play.textContent='Play with sound';invalidate();});
video.addEventListener('error',()=>{status.textContent='TV Dinner could not load. Reload to retry.';status.hidden=false;});
play.onclick=async()=>{try{if(video.paused){await video.play();}else video.pause();}catch(error){status.textContent='Playback could not start. Try Play again.';status.hidden=false;}};
mute.onclick=()=>{video.muted=!video.muted;mute.textContent=video.muted?'Unmute':'Mute';};seek.oninput=()=>{video.currentTime=Number(seek.value);};
const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','TV Dinner installation. Drag to rotate the three objects together: 180 degrees horizontally and from level to 90 degrees overhead. Arrow keys rotate; Home resets.');canvas.style.touchAction='none';
canvas.addEventListener('pointerdown',e=>{if(!ready||!pivot.visible||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;setRotation(yaw+(e.clientX-drag.x)*.006,pitch+(e.clientY-drag.y)*.006);drag.x=e.clientX;drag.y=e.clientY;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;});
canvas.addEventListener('keydown',e=>{if(!pivot.visible)return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')setRotation(0,0);if(e.key==='ArrowLeft')setRotation(yaw-.15,pitch);if(e.key==='ArrowRight')setRotation(yaw+.15,pitch);if(e.key==='ArrowUp')setRotation(yaw,pitch+.15);if(e.key==='ArrowDown')setRotation(yaw,pitch-.15);});
canvas.addEventListener('wheel',event=>{if(!ready||!pivot.visible)return;event.preventDefault();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?host.clientHeight:1);zoom=THREE.MathUtils.clamp(zoom*Math.exp(-delta*.0015),.15,2);resize();},{passive:false});
const visibilityButton=document.getElementById('toggleInstallation');
visibilityButton.onclick=()=>{pivot.visible=!pivot.visible;drag=null;visibilityButton.textContent=pivot.visible?'Hide objects':'Show objects';resize();};
try{
 const loader=new GLTFLoader();const names=['White TV','GTA with Stand','Toilet'];
 for(const [index,name] of names.entries()){
  status.textContent=`Loading ${name} (${index+1}/3)…`;const config=sceneObjects.find(c=>c.name===name);const {scene:model}=await loader.loadAsync(new URL('../'+config.file,import.meta.url).href);
  model.name=name;model.position.fromArray(config.position);model.rotation.fromArray([...config.rotation,'XYZ']);model.scale.setScalar(config.scale??1);arrangement.add(model);
 }
 const bounds=new THREE.Box3().setFromObject(arrangement);arrangement.position.sub(bounds.getCenter(new THREE.Vector3()));radius=bounds.getSize(new THREE.Vector3()).length()/2;ready=true;resize();status.hidden=true;
 await import('./piece-page.js');
}catch(error){console.error(error);status.hidden=false;status.textContent='An installation model could not load. Reload to retry.';window.siteLoading?.fail(status.textContent);}
window.addEventListener('pagehide',()=>{video.pause();cancelAnimationFrame(frame);});
