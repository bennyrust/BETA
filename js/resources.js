export function createResourceOwner() {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const images = new Set();
  const skeletons = new Set();
  return {
    track(object) {
      object.traverse(node => {
        if (node.skeleton) skeletons.add(node.skeleton);
        if (node.geometry) geometries.add(node.geometry);
        for (const material of [node.material].flat().filter(Boolean)) {
          materials.add(material);
          for (const value of Object.values(material)) {
            if (value?.isTexture) textures.add(value);
          }
        }
      });
    },
    release(object) {
      // Transfer ownership without disposing shared scan data or image bitmaps.
      object.traverse(node => {
        if (node.skeleton) skeletons.delete(node.skeleton);
        if (node.geometry) geometries.delete(node.geometry);
        for (const material of [node.material].flat().filter(Boolean)) {
          materials.delete(material);
          for (const value of Object.values(material)) if (value?.isTexture) textures.delete(value);
        }
      });
    },
    dispose() {
      for (const skeleton of skeletons) skeleton.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) {
        texture.dispose();
        if (texture.image?.close) images.add(texture.image);
      }
      for (const image of images) image.close();
      geometries.clear(); materials.clear(); textures.clear(); images.clear(); skeletons.clear();
    },
  };
}
