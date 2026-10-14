import * as THREE from 'three';
import { createRenderScheduler, isClick } from './core.js';
import { createRendering } from './rendering.js';
import { createCameras } from './cameras.js';
import { createLighting } from './lighting.js';
import { createAssets } from './assets.js';
import { createResourceOwner } from './resources.js';
import { createMedia } from './media.js';
import { createMenu } from './menu.js';
import { reportError } from './errors.js';
import { loadPieceCatalog } from './pieces.js';
import { refreshOrientations, watchOrientations } from './orientation-store.js';

export async function start() {
  let ready = false;
  const pieces = await loadPieceCatalog();
  await refreshOrientations();
  const lifetime = new AbortController();
  const { signal } = lifetime;
  watchOrientations(signal);
  let contentPending = false;
  let contentSnapshot = JSON.stringify([...pieces]);
  const contentTimer = setInterval(async () => {
    if (document.hidden || contentPending || signal.aborted) return;
    contentPending = true;
    try {
      const updated = await loadPieceCatalog();
      const snapshot = JSON.stringify([...updated]);
      if (snapshot !== contentSnapshot && !signal.aborted) {
        pieces.clear();
        for (const [key, piece] of updated) pieces.set(key, piece);
        contentSnapshot = snapshot;
        window.dispatchEvent(new Event('piece-content-changed'));
      }
    } catch (error) { console.warn('Piece content refresh failed:', error); }
    finally { contentPending = false; }
  }, 1500);
  signal.addEventListener('abort', () => clearInterval(contentTimer), { once: true });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  const root = new THREE.Group();
  scene.add(root);
  const resources = createResourceOwner();
  const view = createRendering(scene);
  const canvas = view.renderer.domElement;
  let hoverDirty = true, hovered = null, pointer = null, gesture = null, interacted = false;
  let disposed = false;
  const scheduler = createRenderScheduler(() => {
    if (document.hidden || disposed) return false;
    if (hoverDirty) {
      hovered = ready ? pick(pointer) : null;
      hoverDirty = false;
      canvas.classList.toggle('object-hover', Boolean(hovered) && !menu.isOpen);
    }
    const playing = media.playing;
    view.render(cameras.active, menu.isOpen ? null : hovered);
    menu.render(playing);
    return playing;
  });
  function invalidate() { hoverDirty = true; scheduler.invalidate(); }
  const cameras = createCameras(canvas, invalidate);
  cameras.toggle();
  cameras.setBlocked(true);
  const lighting = createLighting(scene);
  const media = createMedia({ resources, invalidate, signal });
  const menu = createMenu({ pieces, invalidate, signal, onChange(open) {
    cameras.setBlocked(open);
    gesture = null;
    hovered = null;
  } });
  const assets = createAssets({ root, resources, signal, invalidate, onProgress(done, total, name) {
    window.siteLoading?.update(done / total * 90, `Loading objects: ${done}/${total} — ${name}`);
  }, onModel(config, model) {
    if (config.name === 'Room') {
      cameras.setRoom(model);
      if (!interacted) cameras.frame(root);
    }
    if (config.name === 'Cabinet') lighting.updateCabinet(model);
    media.attach(config.name, model);
    view.sceneChanged();
  } });
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(point) {
    if (!point || !cameras.isLocked || menu.isOpen) return null;
    const rect = canvas.getBoundingClientRect();
    if (point.x < rect.left || point.y < rect.top || point.x > rect.right || point.y > rect.bottom) return null;
    ndc.set((point.x - rect.left) / rect.width * 2 - 1, -(point.y - rect.top) / rect.height * 2 + 1);
    cameras.active.updateMatrixWorld();
    root.updateMatrixWorld(true);
    raycaster.setFromCamera(ndc, cameras.active);
    // Room surfaces occlude objects: clicks cannot pass through furniture or walls.
    const hit = raycaster.intersectObjects(root.children, true)[0];
    for (let node = hit?.object; node && node !== root; node = node.parent) {
      if (node.userData.interactive || assets.selectable.includes(node)) return node;
    }
    return null;
  }
  function resize() {
    const width = Math.max(1, innerWidth), height = Math.max(1, innerHeight);
    cameras.resize(width, height);
    view.resize(width, height);
    menu.resize();
    invalidate();
  }
  window.addEventListener('resize', resize, { signal });
  window.addEventListener('keydown', event => {
    if (!ready) return;
    media.resumeBlocked();
    if (menu.isOpen || event.target.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
    if (event.repeat && ['Space', 'KeyR'].includes(event.code)) return;
    if (!cameras.key(event.code)) return;
    event.preventDefault();
    interacted = true;
    gesture = null;
    invalidate();
  }, { signal });
  canvas.addEventListener('pointerdown', event => {
    if (!ready) return;
    media.resumeBlocked();
    if (menu.isOpen || gesture || ![0, 2].includes(event.button)) return;
    interacted = true;
    canvas.focus();
    pointer = { x: event.clientX, y: event.clientY };
    gesture = { id: event.pointerId, button: event.button, start: pointer, moved: false };
    cameras.pointerDown(event);
    canvas.setPointerCapture(event.pointerId);
    invalidate();
  }, { signal });
  canvas.addEventListener('pointermove', event => {
    pointer = { x: event.clientX, y: event.clientY };
    if (gesture?.id === event.pointerId) {
      if (!isClick(gesture.start, pointer)) gesture.moved = true;
      cameras.pointerMove(event);
    }
    invalidate();
  }, { signal });
  function release(event) {
    if (gesture?.id !== event.pointerId) return;
    const click = event.type === 'pointerup' && gesture.button === 0 && !gesture.moved;
    const start = gesture.start;
    gesture = null;
    cameras.pointerUp();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointer = { x: event.clientX, y: event.clientY };
    if (click && isClick(start, pointer)) {
      const object = pick(pointer); // Hit-test the release position, never a stale hover result.
      if (object) {
        try {
          media.attach(object.name, object);
          media.play(object.name);
          const source = object.name === 'GTA with Stand' ? assets.models.get('GTA TV (no stand)') || object : object;
          menu.open(object.name, source, object);
        } catch (error) { reportError(object.name, 'Object preview', error); }
      }
    }
    invalidate();
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, release, { signal });
  canvas.addEventListener('pointerleave', () => { pointer = null; invalidate(); }, { signal });
  canvas.addEventListener('contextmenu', event => { if (cameras.isLocked) event.preventDefault(); }, { signal });
  window.addEventListener('blur', () => { gesture = null; cameras.pointerUp(); pointer = null; invalidate(); }, { signal });
  document.addEventListener('visibilitychange', () => { media.visibility(document.hidden); invalidate(); }, { signal });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    reportError('Graphics', 'WebGL context lost. Reload the page to restore the viewer.', event);
  }, { signal });

  function dispose() {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    scheduler.dispose();
    cameras.dispose();
    menu.dispose();
    media.dispose();
    resources.dispose();
    scene.traverse(node => node.shadow?.dispose());
    view.dispose();
  }
  window.addEventListener('pagehide', event => {
    if (event.persisted && window.self === window.top) media.visibility(true);
    else dispose();
  }, { signal });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      if (disposed) { location.reload(); return; }
      if (!cameras.isLocked) cameras.toggle();
      media.visibility(document.hidden);
      resize();
      invalidate();
    }
  }, { signal });
  resize();
  await assets.load();
  window.siteLoading?.update(94, 'Buffering video screens...');
  await media.ready();
  if (!disposed) {
    window.siteLoading?.update(98, 'Preparing player view...');
    // Include image planes, and never override a camera the visitor has already moved.
    if (!interacted) cameras.frame(root);
    resize();
    view.render(cameras.active, null);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    ready = true;
    cameras.setBlocked(false);
    window.siteLoading?.finish();
    invalidate();
  }
  return { dispose };
}
