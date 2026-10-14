import * as THREE from 'three';
import {createAssets} from './assets.js';
import {createResourceOwner} from './resources.js';
import {createRendering} from './rendering.js';
import {createLighting} from './lighting.js';
import {createMedia} from './media.js';
import {loadPieceCatalog} from './pieces.js';
import {createMenu} from './menu.js';
const scene=new THREE.Scene();scene.background=new THREE.Color('#111');
const root=new THREE.Group();scene.add(root);
const view=createRendering(scene),camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.005,100);
const resources=createResourceOwner(),controller=new AbortController(),frame=document.getElementById('laptopSite');
const lighting=createLighting(scene);let laptop,raf,frozen=false,disposed=false;
const media=createMedia({resources,signal:controller.signal,invalidate:()=>{}});
// Corners measured on the scan, inset within the bezel. Offset toward the viewer.
const corners=[[-.14105,.82582,-.2316],[.20352,.82243,-.22746],[.19750,.65343,-.13574],[-.14281,.65469,-.14094]];
function placeScreen(){
 if(!laptop)return;
 const points=corners.map(p=>{const v=laptop.localToWorld(new THREE.Vector3(...p)).project(camera);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2];});
 const source=[[0,0],[1280,0],[1280,720],[0,720]],a=[];
 for(let i=0;i<4;i++){const [x,y]=source[i],[u,v]=points[i];a.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);}
 for(let i=0;i<8;i++){let p=i;for(let j=i+1;j<8;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;[a[i],a[p]]=[a[p],a[i]];const d=a[i][i];for(let k=i;k<9;k++)a[i][k]/=d;for(let j=0;j<8;j++)if(j!==i){const f=a[j][i];for(let k=i;k<9;k++)a[j][k]-=f*a[i][k];}}
 const h=a.map(r=>r[8]);frame.style.transform=`matrix3d(${[h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1].join(',')})`;
 frame.style.visibility='visible';
}
function resize(){if(!frozen){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();camera.updateMatrixWorld();view.resize(innerWidth,innerHeight);}placeScreen();}
addEventListener('resize',resize);resize();
const assets=createAssets({excludeNames:['Print'],root,resources,signal:controller.signal,invalidate:()=>{},onProgress:(n,total,name)=>window.siteLoading?.update(n/total*95,`Loading ${name}…`),onModel:(config,model)=>{
 // Exclude the receipt printer and its scanned paper from this branch view.
 if(config.name==='Print'){model.removeFromParent();return;}
 model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
 if(config.name==='Cabinet')lighting.updateCabinet(model);
 media.attach(config.name,model);
 if(config.name==='Laptop'){
  laptop=model;const center=model.localToWorld(new THREE.Vector3(.028,.745,-.18));
  const front=new THREE.Vector3(0,0,1).transformDirection(model.matrixWorld);
  camera.position.copy(center).addScaledVector(front,.72);camera.lookAt(center);camera.updateMatrixWorld();
 }
}});
// A projected hit area survives GPU disposal and scales with the frozen backdrop.
function addPrinterLink(piece,openPreview){
 const printer=assets.models.get('3Dprinter');
 if(!printer||!piece)return;
 // The printer and table are one scan. The tabletop ends at local Y=.495.
 // Project only printer triangles, preserving its silhouette and empty spaces.
 const vertices=[],inverse=printer.matrixWorld.clone().invert();
 printer.updateWorldMatrix(true,true);
 printer.traverse(node=>{
  if(!node.isMesh||!node.visible)return;
  const geometry=node.geometry,positions=geometry.attributes.position,index=geometry.index;
  const local=inverse.clone().multiply(node.matrixWorld);
  for(let i=0;i<(index?index.count:positions.count);i+=3){
   let polygon=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(positions,index?index.getX(i+k):i+k).applyMatrix4(local));
   const clipped=[];
   for(let k=0;k<polygon.length;k++){
    const a=polygon[k],b=polygon[(k+1)%polygon.length],inside=a.y>=.495,nextInside=b.y>=.495;
    if(inside)clipped.push(a);
    if(inside!==nextInside)clipped.push(a.clone().lerp(b,(.495-a.y)/(b.y-a.y)));
   }
   if(clipped.length<3)continue;
   const world=clipped.map(v=>v.applyMatrix4(printer.matrixWorld));
   for(let k=1;k<world.length-1;k++)for(const v of [world[0],world[k],world[k+1]])vertices.push(v.x,v.y,v.z);
  }
 });
 if(!vertices.length)return;
 // Render a depth-tested silhouette once, so the table hides the printer's back
 // and underside exactly as it does in the frozen scene.
 const black=new THREE.MeshBasicMaterial({color:0x000000,side:THREE.DoubleSide}),saved=[];
 scene.traverse(node=>{if(node.isMesh){saved.push([node,node.material]);node.material=black;}});
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 const white=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const mask=new THREE.Mesh(geometry,white),background=scene.background;scene.add(mask);scene.background=new THREE.Color(0);
 const raster=document.createElement('canvas');raster.width=1000;raster.height=Math.round(1000*innerHeight/innerWidth);
 const ctx=raster.getContext('2d',{willReadFrequently:true});
 try{view.renderer.render(scene,camera);ctx.drawImage(view.renderer.domElement,0,0,raster.width,raster.height);}
 finally{mask.removeFromParent();scene.background=background;for(const [node,material] of saved)node.material=material;geometry.dispose();white.dispose();black.dispose();}
 const pixels=ctx.getImageData(0,0,raster.width,raster.height).data,triangles=[];
 for(let y=0;y<raster.height;y++){
  for(let x=0;x<raster.width;x++){
   if(pixels[(y*raster.width+x)*4]<128)continue;
   const start=x;while(x<raster.width&&pixels[(y*raster.width+x)*4]>=128)x++;
   const top=y*1000/raster.height,bottom=(y+1)*1000/raster.height;
   triangles.push(`M${start},${top}H${x}V${bottom}H${start}Z`);
  }
 }
 if(!triangles.length)return;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.id='laptopPrinterLink';svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');
 Object.assign(svg.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'1',pointerEvents:'none'});
 const link=document.createElementNS(ns,'a');
 link.setAttribute('href','#printer-details');link.setAttribute('role','button');link.setAttribute('aria-label',`Details about ${piece.name}`);
 link.addEventListener('pointerdown',event=>{if(event.button===0)event.preventDefault();});
 link.addEventListener('click',event=>{event.preventDefault();openPreview();});
 link.addEventListener('keydown',event=>{if(event.code==='Space'){event.preventDefault();openPreview();}});
 const defs=document.createElementNS(ns,'defs');
 defs.innerHTML='<filter id="printerHalo" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.3" result="expanded"/><feComposite in="expanded" in2="SourceAlpha" operator="out" result="edge"/><feFlood flood-color="#ffe7a5"/><feComposite in2="edge" operator="in" result="outline"/><feComponentTransfer in="SourceGraphic" result="tint"><feFuncA type="linear" slope="0.08"/></feComponentTransfer><feMerge><feMergeNode in="outline"/><feMergeNode in="tint"/></feMerge></filter>';
 svg.append(defs);
 const shape=document.createElementNS(ns,'path');
 shape.setAttribute('d',triangles.join(''));
 shape.setAttribute('filter','url(#printerHalo)');
 shape.setAttribute('fill','transparent');shape.style.pointerEvents='all';shape.style.cursor='pointer';
 const highlight=active=>{shape.setAttribute('fill',active?'#ffe7a5':'transparent');};
 link.addEventListener('pointerenter',()=>highlight(true));link.addEventListener('pointerleave',()=>highlight(false));
 link.addEventListener('focus',()=>highlight(true));link.addEventListener('blur',()=>highlight(false));
 link.append(shape);svg.append(link);document.body.append(svg);
}
function disposeScene(){
 if(disposed)return;disposed=true;cancelAnimationFrame(raf);controller.abort();
 media.dispose();resources.dispose();scene.traverse(node=>node.shadow?.dispose());view.dispose();view.renderer.forceContextLoss();
}
// The camera and surroundings are static. Keep their rendered appearance while
// releasing the parent GPU scene before the interactive child starts loading.
function freezeBackdrop(){
 view.sceneChanged();view.render(camera,null);
 const backdrop=document.createElement('img');backdrop.alt='';backdrop.setAttribute('aria-hidden','true');
 backdrop.src=view.renderer.domElement.toDataURL('image/png');
 Object.assign(backdrop.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
 document.body.prepend(backdrop);frozen=true;disposeScene();
 // Resizing only needs the screen's transform, not the scan's geometry/textures.
 const anchor=new THREE.Object3D();anchor.matrixAutoUpdate=false;
 anchor.matrix.copy(laptop.matrixWorld);anchor.matrixWorld.copy(laptop.matrixWorld);laptop=anchor;
 assets.models.clear();assets.selectable.length=0;root.clear();scene.clear();
}
// Reuse the already-loaded printer scan instead of decoding it again while
// the nested room is loading. Its resources have a separate lifetime.
const previewController=new AbortController(),previewResources=createResourceOwner();
let menu,previewSource,previewFrame;
function renderPreview(){cancelAnimationFrame(previewFrame);previewFrame=requestAnimationFrame(()=>menu?.render(false));}
function setupPrinterPreview(pieces){
 previewSource=assets.models.get('3Dprinter');
 resources.release(previewSource);previewResources.track(previewSource);
 menu=createMenu({pieces,signal:previewController.signal,invalidate:renderPreview,onChange:()=>{},releaseRendererOnClose:true});
 addEventListener('resize',()=>menu.resize(),{signal:previewController.signal});
 return ()=>{if(!menu.isOpen)menu.open('3Dprinter',previewSource);};
}
addEventListener('pagehide',()=>{previewController.abort();cancelAnimationFrame(previewFrame);menu?.dispose();previewResources.dispose();});
try{
 const [pieces]=await Promise.all([loadPieceCatalog(),assets.load()]);resize();addPrinterLink(pieces.get('3Dprinter'),setupPrinterPreview(pieces));freezeBackdrop();
 frame.src=`index.html?view=player&embedded=laptop&instance=${crypto.randomUUID()}`;window.siteLoading?.finish();
}catch(error){console.error(error);window.siteLoading?.fail('Could not load the laptop room. Reload to retry.');}
addEventListener('pagehide',disposeScene);
