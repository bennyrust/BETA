import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {previewOrientations} from './preview-config.js';
import {siteURL} from './economy.js';
export function createItemView(container){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;container.replaceChildren(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,100),loader=new GLTFLoader();camera.position.z=4.5;scene.add(new THREE.HemisphereLight(0xffffff,0x667788,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,4,5);scene.add(light);let current,serial=0,drag;
 function draw(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}
 function dispose(root){root.traverse(n=>{n.geometry?.dispose();for(const m of (Array.isArray(n.material)?n.material:n.material?[n.material]:[])){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}
 function clear(){serial++;if(current){scene.remove(current);dispose(current);current=null;}draw();}
 renderer.domElement.onpointerdown=e=>{drag=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);};renderer.domElement.onpointermove=e=>{if(drag===undefined||!current)return;current.rotation.y+=(e.clientX-drag)*.015;drag=e.clientX;draw();};renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>{drag=undefined;};new ResizeObserver(draw).observe(container);
 return {clear,capture(){draw();return renderer.domElement.toDataURL();},async show(piece,valid){clear();const token=serial;const asset=piece?.assets?.find(a=>a.endsWith('.glb'));if(!asset)throw Error('Model unavailable');const model=(await loader.loadAsync(siteURL(asset))).scene;if(token!==serial||!valid()){dispose(model);return;}const rotation=previewOrientations[piece.sceneName]||previewOrientations[piece.name];if(rotation)model.rotation.set(...rotation);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());model.position.sub(center);const group=new THREE.Group();group.add(model);group.scale.setScalar(1.8/Math.max(size.x,size.y,size.z));current=group;scene.add(group);draw();}};
}
