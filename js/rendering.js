import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { maxPixelRatio } from './config.js';

export function createRendering(scene) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.useLegacyLights = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // All room geometry and lights are static; refresh shadows only after scene changes.
  renderer.shadowMap.autoUpdate = false;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '3D room. Space switches cameras. Arrow keys turn. R resets the room view.');
  document.body.appendChild(renderer.domElement);

  let composer, renderPass, outline, output;
  function ensurePipeline(camera) {
    if (composer) return;
    composer = new EffectComposer(renderer);
    renderPass = new RenderPass(scene, camera);
    outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
    outline.edgeStrength = 2.1;
    outline.edgeGlow = 0.375;
    outline.edgeThickness = 1;
    outline.visibleEdgeColor.set('#c8a24a');
    outline.hiddenEdgeColor.set('#000000');
    composer.addPass(renderPass);
    composer.addPass(outline);
    // r152 renders offscreen targets in linear color space. Convert exactly once,
    // after compositing, whether or not an object is highlighted.
    output = new ShaderPass(GammaCorrectionShader);
    output.material.toneMapped = false;
    composer.addPass(output);
  }
  return {
    renderer,
    resize(width, height) {
      const ratio = Math.min(devicePixelRatio || 1, maxPixelRatio);
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height);
      if (composer) { composer.setPixelRatio(ratio); composer.setSize(width, height); }
    },
    sceneChanged() { renderer.shadowMap.needsUpdate = true; },
    render(camera, selected) {
      ensurePipeline(camera);
      renderPass.camera = camera;
      outline.renderCamera = camera;
      outline.selectedObjects = selected ? [selected] : [];
      outline.enabled = Boolean(selected);
      composer.render();
    },
    dispose() {
      outline?.dispose();
      output?.dispose();
      renderPass?.dispose();
      composer?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
