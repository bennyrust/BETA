import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// A model added to this repository becomes the demo without duplicating its asset.
const host=document.getElementById('machineDemo'),status=document.getElementById('demoStatus');
try {
 const response=await fetch('./files.json',{cache:'no-store'});
 if(!response.ok)throw Error('Demo repository unavailable');
 const files=await response.json(),file=files.find(f=>/\.glb$/i.test(f.file));
 if(file){
  const {scene:model}=await new GLTFLoader().loadAsync(new URL(file.file,location.href).href);
  const scene=new THREE.Scene();scene.background=new THREE.Color('white');scene.add(model);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()).length();model.position.sub(bounds.getCenter(new THREE.Vector3()));
  const camera=new THREE.PerspectiveCamera(40,1,.001,1000);camera.position.set(0,size*.15,size*1.7);
  scene.add(new THREE.HemisphereLight(0xffffff,0x777777,1.5));const light=new THREE.DirectionalLight(0xffffff,1.5);light.position.set(2,3,4);scene.add(light);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.outputColorSpace=THREE.SRGBColorSpace;host.querySelector('img').replaceWith(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.minDistance=size*.6;controls.maxDistance=size*4;
  const draw=()=>renderer.render(scene,camera);controls.addEventListener('change',draw);
  new ResizeObserver(()=>{renderer.setSize(host.clientWidth,420);camera.aspect=host.clientWidth/420;camera.updateProjectionMatrix();draw();}).observe(host);
  controls.update();draw();
 }
}catch(error){status.hidden=false;status.textContent='3D demo could not load. Reference photo shown.';console.error(error);}
await import('./piece-page.js');
