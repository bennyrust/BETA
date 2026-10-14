import * as THREE from 'three';
import { reportError } from './errors.js';

const files = { Window: 'pieces/window/CSGO.mp4', 'White TV': 'pieces/white-tv/TV Dinner.mp4', Trump: 'pieces/nyan-cat/nyan_cat.mp4' };

export function createMedia({ resources, invalidate, signal }) {
  const entries = new Map();
  let disposed = false;
  function attach(name, model) {
    if (!files[name] || entries.has(name) || disposed) return;
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.autoplay = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide, depthWrite: false });
    let mesh;
    model.updateWorldMatrix(true, true);
    if (name === 'Window') {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.95), material);
      model.add(mesh);
      mesh.position.copy(model.worldToLocal(new THREE.Vector3(-0.995, 1.25, 0.35)));
      const inverse = model.getWorldQuaternion(new THREE.Quaternion()).invert();
      mesh.quaternion.copy(inverse.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))));
      mesh.position.z = 0.004;
      mesh.position.x -= 0.01;
    } else if (name === 'Trump') {
      // Profilo's circular front points along model-local +Y. Fit the video to
      // the scanned surface so its edges do not float above the curved face.
      const geometry = new THREE.RingGeometry(0, 0.102, 64, 12);
      const positions = geometry.attributes.position;
      const ray = new THREE.Raycaster();
      const direction = new THREE.Vector3(0, -1, 0).transformDirection(model.matrixWorld);
      const point = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        point.set(positions.getX(i) - 0.0087, 0.35, -positions.getY(i) + 0.0007);
        ray.set(model.localToWorld(point.clone()), direction);
        const hit = ray.intersectObject(model, true)[0];
        if (hit) point.copy(model.worldToLocal(hit.point)).y += 0.001;
        else point.y = 0.26;
        positions.setXYZ(i, point.x, point.y, point.z);
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'Nyan Cat';
      mesh.userData.interactive = true;
      // Key near-white video pixels at render time; keep the source animation intact.
      material.transparent = true;
      material.alphaTest = 0.02;
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          float whiteLevel = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
          diffuseColor.a *= 1.0 - smoothstep(0.80, 0.96, whiteLevel);
        `);
      };
      material.customProgramCacheKey = () => 'nyan-white-key-v1';
      model.add(mesh);
      // Crop to a square without stretching the animation inside the circle.
      video.addEventListener('loadedmetadata', () => {
        const aspect = video.videoWidth / video.videoHeight;
        if (aspect > 1) { texture.repeat.set(1 / aspect, 1); texture.offset.set((1 - 1 / aspect) / 2, 0); }
        else { texture.repeat.set(1, aspect); texture.offset.set(0, (1 - aspect) / 2); }
        invalidate();
      }, { signal });
    } else {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.15, size.y * 0.9), material);
      mesh.scale.setScalar(0.2);
      const screenSurface = [...model.children];
      model.add(mesh);
      mesh.position.copy(model.worldToLocal(center));
      mesh.position.z -= 0.02;
      mesh.position.y += 0.0275;
      mesh.rotation.set(-Math.PI / 2, Math.PI, 0);
      mesh.updateWorldMatrix(true, false);
      // Keep the exact rectangle and UVs, but place the entire video ahead of
      // the scan's frontmost point. Following the noisy glass vertex-by-vertex
      // let the rim intersect the video between samples, especially at corners.
      const positions = mesh.geometry.attributes.position;
      const inverse = mesh.matrixWorld.clone().invert();
      const transform = new THREE.Matrix4();
      const point = new THREE.Vector3();
      // The video faces local -Z toward the player (world +Z).
      // Preserve its existing rotation and UVs while fitting this side.
      let front = Infinity;
      for (const surface of screenSurface) surface.traverse(node => {
        if (!node.isMesh || !node.geometry?.attributes.position) return;
        transform.multiplyMatrices(inverse, node.matrixWorld);
        const vertices = node.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
          point.fromBufferAttribute(vertices, i).applyMatrix4(transform);
          front = Math.min(front, point.z);
        }
      });
      const worldScale = mesh.getWorldScale(new THREE.Vector3());
      const clearance = 0.001 / Math.max(Math.abs(worldScale.z), 0.0001);
      if (Number.isFinite(front)) {
        for (let i = 0; i < positions.count; i++) positions.setZ(i, front - clearance);
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingSphere();
    }
    resources.track(mesh);
    // Never display the video texture's empty black frame while decoding starts.
    if (name === 'White TV') {
      const poster = new THREE.TextureLoader().load('pieces/white-tv/loading-frame.png', () => {
        if (!disposed) invalidate();
      });
      poster.colorSpace = THREE.SRGBColorSpace;
      material.map = poster;
      resources.track(mesh);
      const revealVideo = () => {
        if (disposed || signal.aborted || video.readyState < 2) return;
        material.map = texture;
        texture.needsUpdate = true;
        material.needsUpdate = true;
        invalidate();
      };
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(revealVideo);
      else video.addEventListener('loadeddata', revealVideo, { once: true, signal });
    }
    const entry = { video, pending: false, resume: false, blocked: false };
    entries.set(name, entry);
    for (const event of ['loadeddata', 'playing', 'pause', 'ended', 'seeked']) video.addEventListener(event, invalidate, { signal });
    video.addEventListener('canplay', () => {
      if (!document.hidden && video.paused) play(name);
    }, { signal });
    video.addEventListener('error', () => reportError(name, files[name], video.error), { signal });
    video.addEventListener('playing', () => {
      if (document.hidden) { entry.resume = true; video.pause(); }
    }, { signal });
    // Start fetching at model spawn, independently of camera mode or preview clicks.
    video.src = files[name];
    video.load();
    if (document.hidden) entry.resume = true;
    else play(name);
    invalidate();
  }
  function play(name) {
    const entry = entries.get(name === 'Nyan Cat' ? 'Trump' : name);
    if (!entry || entry.pending || disposed) return;
    entry.pending = true;
    entry.video.play().then(() => { entry.blocked = false; }).catch(error => {
      if (error.name === 'NotAllowedError') entry.blocked = true;
      else if (error.name === 'AbortError') entry.blocked = true;
      else if (!disposed) reportError(name, files[name], error);
    }).finally(() => { entry.pending = false; invalidate(); });
  }
  return {
    attach, play,
    async ready() {
      await Promise.all([...entries].map(([name, { video }]) => new Promise((resolve, reject) => {
        if (video.readyState >= 2) return resolve();
        let timer;
        const cleanup = () => { clearTimeout(timer); video.removeEventListener('loadeddata', loaded); video.removeEventListener('error', failed); signal.removeEventListener('abort', failed); };
        const loaded = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); if (!signal.aborted) console.warn(`Video still unavailable; continuing room startup: ${files[name]}`); resolve(); };
        video.addEventListener('loadeddata', loaded, { once: true });
        video.addEventListener('error', failed, { once: true });
        signal.addEventListener('abort', failed, { once: true });
        timer = setTimeout(failed, 8000);
        if (video.error || signal.aborted) failed();
      })));
    },
    resumeBlocked() {
      for (const [name, entry] of entries) if (entry.blocked || entry.video.paused) play(name);
    },
    get playing() { return [...entries.values()].some(({ video }) => !video.paused && !video.ended && video.readyState >= 2); },
    visibility(hidden) {
      for (const [name, entry] of entries) {
        if (hidden) { entry.resume = entry.resume || !entry.video.paused; entry.video.pause(); }
        else if (entry.resume) { entry.resume = false; play(name); }
      }
    },
    dispose() {
      disposed = true;
      for (const { video } of entries.values()) { video.pause(); video.removeAttribute('src'); video.load(); }
      entries.clear();
    },
  };
}
