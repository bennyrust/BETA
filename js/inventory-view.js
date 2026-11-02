import {createResourceOwner} from './resources.js';
import {runtimeAsset} from './runtime-assets.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {previewOrientations} from './preview-config.js';
import {siteURL} from './economy.js';
export function createItemView(container,options={}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;container.replaceChildren(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,100),loader=new GLTFLoader();camera.position.z=4.5;scene.add(new THREE.HemisphereLight(0xffffff,0x667788,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,4,5);scene.add(light);let current,serial=0,drag,radius=1,lastWidth=0,lastHeight=0;const box=new THREE.Box3(),fitSize=new THREE.Vector3();let owner=createResourceOwner();
 function draw(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;if(w!==lastWidth||h!==lastHeight){renderer.setSize(w,h,false);lastWidth=w;lastHeight=h;}camera.aspect=w/h;
 // Preserve the original preview distance; pull back only when actual bounds need it.
 const vertical=THREE.MathUtils.degToRad(camera.fov)/2;
 const horizontal=Math.atan(Math.tan(vertical)*camera.aspect);
 if(current){
  current.updateMatrixWorld(true);
  const size=box.setFromObject(current).getSize(fitSize);
  const fit=Math.max(size.y/(2*Math.tan(vertical)),size.x/(2*Math.tan(horizontal)))+size.z/2;
  camera.position.z=Math.max(4.5,fit*1.1);
 }else camera.position.z=4.5;
 camera.near=Math.max(.01,camera.position.z-radius*1.5);camera.far=camera.position.z+radius*3;
 camera.updateProjectionMatrix();renderer.render(scene,camera);}
 function dispose(root){const resources=createResourceOwner();resources.track(root);resources.dispose();}
 function clear(){serial++;if(current){scene.remove(current);owner.dispose();owner=createResourceOwner();current=null;}draw();}
 renderer.domElement.onpointerdown=e=>{drag=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);};renderer.domElement.onpointermove=e=>{if(drag===undefined||!current)return;current.rotation.y+=(e.clientX-drag)*.015;drag=e.clientX;draw();};renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>{drag=undefined;};const observer=new ResizeObserver(draw);observer.observe(container);
 return {clear,dispose(){clear();observer.disconnect();renderer.dispose();renderer.domElement.remove();},capture(){draw();return renderer.domElement.toDataURL();},async show(piece,valid){clear();const token=serial;const asset=piece?.assets?.find(a=>a.endsWith('.glb'));if(!asset)throw Error('Model unavailable');const model=(await loader.loadAsync(runtimeAsset(siteURL(asset)))).scene;if(token!==serial||!valid()){dispose(model);return;}const rotation=previewOrientations[piece.sceneName]||previewOrientations[piece.name];if(rotation)model.rotation.set(...rotation);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());model.position.sub(center);const group=new THREE.Group();group.add(model);group.rotation.z=options.rotationZ||0;group.scale.setScalar(1.8/Math.max(size.x,size.y,size.z));radius=size.length()*.5*group.scale.x;current=group;owner.track(group);scene.add(group);draw();}};
}
