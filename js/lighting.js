import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export function createLighting(scene) {
  RectAreaLightUniformsLib.init();
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  const ambientFill = new THREE.AmbientLight(0xffffff, 0.065);
  scene.add(ambientFill);

  // Soft sky/ground tint (keeps shadows from going dead-black)
  const hemiFill = new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 0.10);
  scene.add(hemiFill);

  // Soft overhead room fill (broad, low-contrast)
  const overheadArea = new THREE.RectAreaLight(0xfff5e9, 0.30, 10.0, 10.0);
  overheadArea.position.set(0.0, 7.5, -0.4);
  overheadArea.rotation.x = -Math.PI / 2;
  scene.add(overheadArea);

  // Disembodied high fill from above (low-light on everything, no harsh directionality)
  const highFill = new THREE.RectAreaLight(0xffffff, 0.35, 22.0, 22.0);
  highFill.position.set(0.0, 14.0, -0.4);
  highFill.rotation.x = -Math.PI / 2;
  scene.add(highFill);

  // Gallery light from the cabinet’s upper-left, with restrained overhead fill.
  const softSun = new THREE.DirectionalLight(0xfff2df, 0.65);
  // Rake across the shelf and rear wall, consistent with the installation photo.
  softSun.position.set(-1.4, 3.5, 1.2);
  softSun.target.position.set(-.5, .8, -.9);
  scene.add(softSun.target);
  scene.add(softSun);

  softSun.castShadow = true;
  softSun.shadow.mapSize.width = 1024;
  softSun.shadow.mapSize.height = 1024;
  softSun.shadow.bias = -0.00025;
  softSun.shadow.normalBias = 0.02;
  // Large shadow camera = softer, more room-like shadows
  softSun.shadow.camera.left = -8;
  softSun.shadow.camera.right = 8;
  softSun.shadow.camera.top = 8;
  softSun.shadow.camera.bottom = -8;
  softSun.shadow.camera.near = 0.5;
  softSun.shadow.camera.far = 30;
  // Blur radius (PCFSoft)
  softSun.shadow.radius = 10;

  // --- Lamp shade "glow rig" ---
  // Default/fallback lamp position (will be corrected once Cabinet loads)
  const LAMP_SHADE_CENTER = new THREE.Vector3(-0.90, 1.85, -0.78);

  // Helper target object so lights can keep aiming at the shade center
  const lampAimTarget = new THREE.Object3D();
  lampAimTarget.position.copy(LAMP_SHADE_CENTER);
  scene.add(lampAimTarget);

  // 1) Inside-ish emitter (no shadows). Gives warm core.
  const lampEmitter = new THREE.RectAreaLight(0xffd29a, 4.5, 0.55, 0.55);
  lampEmitter.position.copy(LAMP_SHADE_CENTER).add(new THREE.Vector3(0.00, -0.05, 0.00));
  lampEmitter.lookAt(lampAimTarget.position);
  scene.add(lampEmitter);

  // 2) Front key aimed at shade (this is what you see in the Blender screenshot)
  const shadeKeyA = new THREE.RectAreaLight(0xffd6a3, 4.0, 0.80, 0.80);
  // Front/upper-right “card” aimed at the shade (kept close to the lampshade)
  shadeKeyA.position.copy(LAMP_SHADE_CENTER).add(new THREE.Vector3(0.18, 0.20, 0.22));
  shadeKeyA.lookAt(lampAimTarget.position);
  scene.add(shadeKeyA);

  // 3) Side kicker aimed at shade (adds wrap so it reads as luminous, not a hotspot)
  const shadeKeyB = new THREE.RectAreaLight(0xffd6a3, 1.8, 0.95, 0.95);
  // Side “wrap” card kept CLOSE to the shade (avoid pushing toward the window)
  shadeKeyB.position.copy(LAMP_SHADE_CENTER).add(new THREE.Vector3(-0.22, 0.22, 0.18));
  shadeKeyB.lookAt(lampAimTarget.position);
  scene.add(shadeKeyB);

  // Optional: extremely gentle shadow spill onto the room (kept low to avoid triangles)
  const lampSpill = new THREE.SpotLight(0xffd09a, 2.2, 4.5, Math.PI / 1.9, 0.97, 2.0);
// Keep the spill just above/behind the shade so it reads as lamp spill, not window light
lampSpill.position.copy(LAMP_SHADE_CENTER).add(new THREE.Vector3(0.10, 0.45, 0.05));  
lampSpill.target.position.set(-0.10, 0.35, -0.35); // more central downward aim (prevents left-wall streak)
  scene.add(lampSpill.target);
  scene.add(lampSpill);

  lampSpill.castShadow = true;
  lampSpill.shadow.mapSize.width = 1024;
  lampSpill.shadow.mapSize.height = 1024;
  lampSpill.shadow.bias = -0.0002;
  lampSpill.shadow.normalBias = 0.02;
  lampSpill.shadow.radius = 7;

  // Update lamp rig once the Cabinet (lamp asset) is loaded.
  // We attempt to find a shade/lamp-ish mesh and use its world-space bounds center.
  function updateLampRigFromCabinet(cabinetModel) {
    let best = null;
    cabinetModel.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      if (n.includes('shade') || n.includes('lamp')) best = best || o;
    });

    if (!best) return; // keep fallback

    box.setFromObject(best);
    const c = box.getCenter(center).clone();

    // Move target + lights to the detected shade center
    lampAimTarget.position.copy(c);

    lampEmitter.position.copy(c).add(new THREE.Vector3(0.00, -0.05, 0.00));
    lampEmitter.lookAt(lampAimTarget.position);

    shadeKeyA.position.copy(c).add(new THREE.Vector3(0.18, 0.20, 0.22));
    shadeKeyA.lookAt(lampAimTarget.position);

    shadeKeyB.position.copy(c).add(new THREE.Vector3(-0.22, 0.22, 0.18));
    shadeKeyB.lookAt(lampAimTarget.position);

    lampSpill.position.copy(c).add(new THREE.Vector3(0.10, 0.45, 0.05));
    lampSpill.lookAt(lampSpill.target.position);

    lampSpill.target.position.set(-0.10, 0.35, -0.35);

    console.log('Lamp rig positioned from Cabinet shade mesh:', best.name, c);
  }



  return { updateCabinet: updateLampRigFromCabinet };
}
