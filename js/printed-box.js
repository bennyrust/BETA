import * as THREE from 'three';
export function createPrintedBox(texture){
 const box=new THREE.Group();box.name='Printed Buddyologies box';const hinge=new THREE.Group();hinge.name='Lid hinge';hinge.position.set(0,1.6,-.9);box.add(hinge);
 function panel(w,h,rect,parent,position,rotation=[0,0,0],name='Cardstock panel'){
  const map=texture.clone();map.repeat.set(rect[2]/1200,rect[3]/(3751/4603*1200));map.offset.set(rect[0]/1200,1-(rect[1]+rect[3])/(3751/4603*1200));
  const paper=new THREE.MeshStandardMaterial({color:0xd1c6b7,roughness:.93});
  const print=new THREE.MeshStandardMaterial({map,roughness:.48,metalness:0});
  // Six actual surfaces: printed face, unprinted inside and exposed paper edges.
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,.014,1,name==='Lid panel'?24:1,1),[paper,paper,paper,paper,print,paper]);
  mesh.name=name;mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 panel(1.6,1.6,[643,417,262,263],box,[0,.8,.9]);panel(1.6,1.6,[81,417,260,263],box,[0,.8,-.9],[0,Math.PI,0]);
 panel(1.8,1.6,[344,417,296,263],box,[-.8,.8,0],[0,-Math.PI/2,0]);panel(1.8,1.6,[909,417,290,263],box,[.8,.8,0],[0,Math.PI/2,0]);
 panel(1.6,1.8,[643,153,262,263],hinge,[0,0,.9],[-Math.PI/2,0,0],'Lid panel');panel(1.6,1.8,[643,682,262,263],box,[0,.008,0],[Math.PI/2,0,0]);
 const tab=new THREE.Group();tab.name='Front tab';tab.position.set(0,-.012,1.788);hinge.add(tab);
 panel(1.48,.32,[650,55,245,55],tab,[0,-.16,0]);
 return box;
}
