import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fitDistance } from './core.js';

const HOME = new THREE.Vector3(0, 1.6, 2.7);
const BIAS = -Math.PI / 18;
const clamp = THREE.MathUtils.clamp;

export function createCameras(canvas, invalidate) {
  const free = new THREE.PerspectiveCamera(60, 1, 0.01, 200);
  const locked = new THREE.PerspectiveCamera(60, 1, 0.01, 200);
  free.position.set(4, 3, 6);
  locked.position.copy(HOME);
  locked.rotation.order = 'YXZ';
  const controls = new OrbitControls(free, canvas);
  controls.target.set(0, 1, 0);
  controls.update();
  controls.addEventListener('change', invalidate);
  const target = new THREE.Vector3(0, 1.6, 0);
  const box = new THREE.Box3();
  let lockedView = false;
  let yaw = 0, pitch = 0, dragYaw = 0, dragPitch = 0;
  let drag = null;
  let blocked = false;

  function aim() {
    const direction = target.clone().sub(locked.position);
    yaw = Math.atan2(-direction.x, -direction.z);
    pitch = Math.atan2(direction.y, Math.hypot(direction.x, direction.z)) + BIAS;
    apply();
  }
  function apply() {
    locked.rotation.set(clamp(pitch + dragPitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001), yaw + dragYaw, 0);
    invalidate();
  }
  function reset() {
    locked.position.copy(HOME);
    dragYaw = dragPitch = 0;
    drag = null;
    aim();
  }
  reset();

  return {
    free, locked, controls,
    get active() { return lockedView ? locked : free; },
    get isLocked() { return lockedView; },
    setBlocked(value) { blocked = value; drag = null; controls.enabled = !value && !lockedView; },
    toggle() {
      lockedView = !lockedView;
      drag = null;
      controls.enabled = !lockedView && !blocked;
      invalidate();
    },
    key(code) {
      if (blocked) return false;
      if (code === 'Space') { this.toggle(); return true; }
      if (!lockedView) return false;
      if (code === 'KeyR') { reset(); return true; }
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        yaw += dragYaw + (code === 'ArrowLeft' ? Math.PI / 4 : -Math.PI / 4);
        pitch += dragPitch;
        dragYaw = dragPitch = 0;
        apply();
        return true;
      }
      return code === 'ArrowUp' || code === 'ArrowDown';
    },
    pointerDown(event) {
      if (!lockedView || blocked || event.button !== 0) return;
      drag = { id: event.pointerId, button: event.button, x: event.clientX, y: event.clientY };
    },
    pointerMove(event) {
      if (!drag || drag.id !== event.pointerId || blocked) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      drag.x = event.clientX; drag.y = event.clientY;
      {
        dragYaw = clamp(dragYaw - dx * 0.005, -Math.PI / 12, Math.PI / 12);
        dragPitch = clamp(dragPitch - dy * 0.005, -Math.PI / 18, Math.PI / 18);
        apply();
      }
    },
    pointerUp() { drag = null; },
    setRoom(model) {
      box.setFromObject(model);
      if (box.isEmpty()) return;
      box.getCenter(target);
      target.y = HOME.y;
      reset();
    },
    frame(root) {
      box.setFromObject(root);
      if (box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const max = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(max) || max <= 0) return;
      // A bounding sphere is conservative for the diagonal overview angle.
      const diameter = size.length();
      const distance = fitDistance(new THREE.Vector3(diameter, diameter, 0), free.fov, free.aspect);
      free.position.copy(center).add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(distance));
      free.near = Math.max(max / 100, 0.001);
      free.far = Math.max(distance + max * 10, 100);
      free.updateProjectionMatrix();
      controls.target.copy(center);
      controls.update();
      invalidate();
    },
    resize(width, height) {
      for (const camera of [free, locked]) { camera.aspect = width / height; camera.updateProjectionMatrix(); }
    },
    dispose() { controls.removeEventListener('change', invalidate); controls.dispose(); },
  };
}
