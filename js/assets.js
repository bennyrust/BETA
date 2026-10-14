import { varyVape } from './vape-variation.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sceneObjects, imageObjects, loadPriority, selectableNames } from './config.js';
import { prioritize, loadSequentially } from './core.js';
import { reportError } from './errors.js';

export function createAssets({ root, resources, signal, onModel, invalidate, onProgress = () => {}, excludeNames = [] }) {
  const models = new Map();
  const selectable = [];
  const loader = new GLTFLoader();
  const textures = new THREE.TextureLoader();

  function register(config, model) {
    resources.track(model);
    if (signal.aborted) { resources.dispose(); return; }
    model.name = config.name;
    models.set(config.name, model);
    if (!config.menuOnly) {
      root.add(model);
      if (selectableNames.has(config.name)) selectable.push(model);
    }
    model.updateWorldMatrix(true, true);
    onModel(config, model);
    invalidate();
  }

  async function loadModel(config) {
    const { scene: model } = await loader.loadAsync(config.file);
    varyVape(model,config.file);
    // Track immediately so even a failed setup cannot leak GPU resources.
    resources.track(model);
    model.position.fromArray(config.position);
    model.rotation.fromArray([...config.rotation, 'XYZ']);
    model.scale.setScalar(config.scale ?? 1);
    if (config.name === 'Side Table') {
      // This exact node is now loaded independently as the Cheese piece.
      const plate = model.getObjectByName('Mesh_0');
      if (!plate?.isMesh) throw new Error('Embedded side-table cheese mesh not found');
      plate.removeFromParent();
    }
    if (config.name === 'Gold TV') {
      model.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -3 * Math.PI / 4);
      model.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 3 * Math.PI / 8);
    }
    if (config.name === 'Room') {
      model.traverse(node => {
        for (const material of [node.material].flat().filter(Boolean)) {
          if ('flatShading' in material) { material.flatShading = true; material.needsUpdate = true; }
        }
      });
    }
    return model;
  }

  async function loadImage(config) {
    const texture = await textures.loadAsync(config.file);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    const height = 0.75 * 0.75;
    const model = new THREE.Mesh(
      new THREE.PlaneGeometry(height * texture.image.width / texture.image.height, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
    );
    model.position.fromArray(config.position);
    model.rotation.y = config.yaw;
    return model;
  }

  return {
    models, selectable,
    async load() {
      // Images join the same queue: no simultaneous large image decode and GLB upload.
      const queue = [...prioritize(sceneObjects, loadPriority), ...imageObjects].filter(config => !excludeNames.includes(config.name));
      let completed = 0, failed = 0;
      await loadSequentially(queue, config => config.file.endsWith('.glb') ? loadModel(config) : loadImage(config), {
        signal,
        onLoaded(config, model) { register(config, model); onProgress(++completed, queue.length, config.name); },
        onError(config, error) { failed++; reportError(config.name, config.file, error); onProgress(++completed, queue.length, config.name); },
      });
      if (failed) throw new Error(`${failed} scene assets failed to load`);
    },
  };
}
