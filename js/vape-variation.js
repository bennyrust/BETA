// Stable, small surface variations; source GLBs and UV labels stay untouched.
export function varyVape(model, path) {
  const file = decodeURIComponent(path).split('/').pop();
  if (!/ vape\.glb$/i.test(file) || model.userData.vapeVariation) return;
  model.userData.vapeVariation = true;
  let seed = 0;
  for (const c of file) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0;
  const phase = (seed % 1000) / 1000 * Math.PI * 2;
  const box={min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}};
  model.traverse(node=>{if(!node.isMesh)return;node.geometry.computeBoundingBox();const b=node.geometry.boundingBox;for(const axis of ['x','y','z']){box.min[axis]=Math.min(box.min[axis],b.min[axis]);box.max[axis]=Math.max(box.max[axis],b.max[axis]);}});
  const extent=Math.max(box.max.x-box.min.x,box.max.y-box.min.y,box.max.z-box.min.z);
  model.traverse(node => {
    if (!node.isMesh) return;
    const geometry = node.geometry;
    if (!extent) return;
    const pos=geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      const u=(x-box.min.x)/extent,v=(y-box.min.y)/extent,w=(z-box.min.z)/extent;
      // Continuous displacement keeps coincident vertices together and avoids cracks.
      pos.setXYZ(i,x+extent*.0025*Math.sin(v*9+w*4+phase),y+extent*.0015*Math.sin(u*7+w*5+phase),z+extent*.002*Math.sin(u*8+v*6+phase));
    }
    pos.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    for(const material of [node.material].flat()){
      material.color?.multiplyScalar(.96+(seed%9)*.008);
      if ('roughness' in material) material.roughness=Math.max(.65,Math.min(1,material.roughness+((seed%7)-3)*.015));
    }
  });
}
