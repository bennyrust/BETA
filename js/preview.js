import * as THREE from 'three';
import { orientations as previewOrientations } from './orientation-store.js';

export const PREVIEW_ROTATION_LIMIT = Math.PI / 12;

export function alignPreview(object, reference) {
  reference.updateWorldMatrix(true, true);
  const rotation = previewOrientations[object.name] || previewOrientations[reference.name];
  if (!rotation) throw new Error(`Missing preview orientation for ${reference.name}`);
  object.position.set(0, 0, 0);
  object.rotation.set(...rotation, 'XYZ');
  reference.getWorldScale(object.scale);
}

export function rotatePreview(group, pitchDelta, yawDelta) {
  group.rotation.x = THREE.MathUtils.clamp(group.rotation.x + pitchDelta, -PREVIEW_ROTATION_LIMIT, PREVIEW_ROTATION_LIMIT);
  group.rotation.y = THREE.MathUtils.clamp(group.rotation.y + yawDelta, -PREVIEW_ROTATION_LIMIT, PREVIEW_ROTATION_LIMIT);
}
