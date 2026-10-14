import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mountPieceFiles } from './piece-files.js';
import { sequenceForVersion, TOTEM_PIXELS_PER_UNIT } from './totem-sequence.js';
const host=document.getElementById('towerViewport'),track=document.getElementById('towerScroll'),status=document.getElementById('towerStatus');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('white');scene.add(new THREE.HemisphereLight(0xffffff,0x777777,1.8));const light=new THREE.DirectionalLight(0xffffff,1.5);light.position.set(-2,4,5);scene.add(light);
const camera=new THREE.OrthographicCamera(-2,2,2,-2,.01,30);let total=0,frame=0;
const pixelsPerUnit=TOTEM_PIXELS_PER_UNIT;
function draw(){frame=0;const view=host.clientHeight/pixelsPerUnit;const offset=Math.max(0,Math.min(total, -track.getBoundingClientRect().top/pixelsPerUnit));camera.position.set(0,-offset-view/2+.25,5);camera.lookAt(0,camera.position.y,0);renderer.render(scene,camera);}
function invalidate(){if(!frame)frame=requestAnimationFrame(draw);}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.left=-w/pixelsPerUnit/2;camera.right=-camera.left;camera.top=h/pixelsPerUnit/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();track.style.height=(total*pixelsPerUnit+h*.3)+'px';invalidate();}
new ResizeObserver(resize).observe(host);window.addEventListener('scroll',invalidate,{passive:true});
try{
 const response=await fetch(new URL('../pieces/pieces.json',import.meta.url),{cache:'no-store'});
 if(!response.ok)throw Error('Version catalog unavailable');
 const catalog=await response.json(),piece=catalog.find(p=>p.id==='can-tower');
 const liveVersion=piece.liveVersion||'V1',requested=new URLSearchParams(location.search).get('version');
 const version=['V1','V2'].includes(requested)?requested:liveVersion;
 const sequence=sequenceForVersion(version);
 track.dataset.version=version;track.setAttribute('aria-label',version==='V1'?'Ten cycles of stacked cans, pristine to crushed and back':'Stacked cans progressively crushed in 0.2 percentage point steps');
 if(['localhost','127.0.0.1'].includes(location.hostname)){
  const controls=document.createElement('span');controls.style.cssText='display:inline-flex;gap:8px;margin-left:20px;align-items:center;background:white';
  const select=document.createElement('select');select.setAttribute('aria-label','Totem Pole version');
  for(const value of ['V1','V2']){const option=new Option(value+(value===liveVersion?' (live)':''),value);select.add(option);}select.value=version;
  select.onchange=()=>{const url=new URL(location.href);url.searchParams.set('version',select.value);location.href=url.href;};
  const button=document.createElement('button');button.textContent=version===liveVersion?'Live':'Make live';button.disabled=version===liveVersion;
  const message=document.createElement('span');message.setAttribute('role','status');
  button.onclick=async()=>{button.disabled=true;message.textContent='Saving…';try{const saved=await fetch('/api/pieces',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'can-tower',changes:{liveVersion:version},base:{liveVersion:piece.liveVersion||''}})});if(!saved.ok)throw Error(saved.status===409?'Version changed elsewhere. Reload and retry.':'Could not save version.');location.href=location.pathname;}catch(error){message.textContent=error.message;button.disabled=false;}};
  controls.append(select,button,message);document.querySelector('nav').append(controls);
 }
 const {scene:scan}=await new GLTFLoader().loadAsync(new URL('../pieces/can-tower/Coke cans-2048.glb',import.meta.url).href);
 let source;scan.traverse(node=>{if(node.isMesh&&!source)source=node;});
 const raw=source.geometry.index?source.geometry.toNonIndexed():source.geometry.clone();
 const pos=raw.attributes.position,uv=raw.attributes.uv,vertices=[],texcoords=[];
 // Isolate the uppermost can from the original Diet Coke tower scan.
 const bottom=1.425,top=1.552,height=top-bottom;
 for(let i=0;i<pos.count;i+=3){if(Math.min(pos.getY(i),pos.getY(i+1),pos.getY(i+2))<bottom)continue;
  for(let k=0;k<3;k++){const n=i+k;vertices.push(pos.getX(n),pos.getY(n),pos.getZ(n));texcoords.push(uv.getX(n),uv.getY(n));}}
 if(!vertices.length)throw Error('Top can not found in tower scan');
 const base=new THREE.BufferGeometry();base.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));base.setAttribute('uv',new THREE.Float32BufferAttribute(texcoords,2));base.computeBoundingBox();const center=base.boundingBox.getCenter(new THREE.Vector3()),canMin=base.boundingBox.min.y,canHeight=base.boundingBox.max.y-canMin;
 const original=base.attributes.position;
 // Restore a round, full-height starting can while retaining its scanned artwork.
 for(let i=0;i<original.count;i++){const x=original.getX(i)-center.x,z=original.getZ(i)-center.z,t=THREE.MathUtils.clamp((original.getY(i)-canMin)/canHeight,0,1),angle=Math.atan2(z,x);const rim=(t<.035||t>.965)?.235:.255;const cleanT=t<.02?0:t>.98?1:t;original.setXYZ(i,Math.cos(angle)*rim,cleanT,Math.sin(angle)*rim);}
 const geometries=new Map();
 function geometryFor(ratio){if(geometries.has(ratio))return geometries.get(ratio);const geo=base.clone(),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),t=p.getY(i),z=p.getZ(i),angle=Math.atan2(z,x),crush=1-ratio;const fold=Math.sin(t*Math.PI*10+Math.sin(angle*3)*.65);const envelope=Math.sin(Math.PI*t);const radial=1+crush*envelope*(.22*fold+.07*Math.sin(angle*5+t*14));p.setXYZ(i,x*radial+crush*.035*Math.sin(t*17)*envelope,t*ratio,z*radial+crush*.025*Math.cos(t*13)*envelope);}
  geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();geometries.set(ratio,geo);return geo;}
 const material=source.material.clone();material.side=THREE.DoubleSide;material.roughness=.75;
 const capGeo=new THREE.CylinderGeometry(.235,.235,.006,48),capMaterial=new THREE.MeshStandardMaterial({color:0xc6c7c8,metalness:.65,roughness:.5});
 for(const ratio of sequence){const can=new THREE.Mesh(geometryFor(ratio),material);can.position.y=-total-ratio;scene.add(can);for(const y of [-total,-total-ratio]){const cap=new THREE.Mesh(capGeo,capMaterial);if(version==='V2'){const thickness=Math.min(.006,ratio*.2);cap.scale.y=thickness/.006;cap.position.y=y+(y===-total?-thickness/2:thickness/2);}else cap.position.y=y;scene.add(cap);}total+=ratio;}
 track.dataset.cans=String(sequence.length);track.dataset.cycles=version==='V1'?'10':'0';resize();status.hidden=true;window.siteLoading?.finish();
}catch(error){console.error(error);status.textContent='Totem Pole could not load. Reload to retry.';window.siteLoading?.fail(status.textContent);}
mountPieceFiles('can-tower','can-tower',document.getElementById('towerGallery'),{photosOnly:true});
window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));

fetch(new URL('../pieces/pieces.json',import.meta.url),{cache:'no-store'}).then(r=>r.json()).then(records=>{const piece=records.find(p=>p.id==='can-tower');document.querySelector('h1').textContent=piece.name;document.querySelector('article').textContent=piece.documentation||'';}).catch(console.error);
