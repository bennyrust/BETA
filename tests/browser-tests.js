import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createCameras } from '../js/cameras.js';
import { alignPreview, rotatePreview, PREVIEW_ROTATION_LIMIT } from '../js/preview.js';
import { createRendering } from '../js/rendering.js';
import { createMedia } from '../js/media.js';
import { createMenu } from '../js/menu.js';
import { createResourceOwner } from '../js/resources.js';
import { loadSequentially } from '../js/core.js';
import { reportError } from '../js/errors.js';
import { loadPieceCatalog } from '../js/pieces.js';
import { orientations } from '../js/orientation-store.js';

const pieces = new Map([...(await loadPieceCatalog())].map(([key, piece]) => [key, { ...piece, description: '' }]));

const results = document.getElementById('results');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let count = 0;
async function test(name, run) {
  try { await run(); results.textContent += `PASS ${name}\n`; count++; }
  catch (error) { results.textContent += `FAIL ${name}: ${error.message}\n`; throw error; }
}

await test('player position is fixed, right-drag is ignored, turns and modal blocking work', () => {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const camera = createCameras(canvas, () => {});
  camera.resize(400, 800);
  camera.toggle();
  const home = camera.locked.position.clone();
  const homeRotation = camera.locked.quaternion.clone();
  camera.pointerDown({ pointerId: 1, button: 2, clientX: 0, clientY: 0 });
  camera.pointerMove({ pointerId: 1, clientX: 10000, clientY: 10000 });
  camera.pointerUp();
  const bounded = camera.locked.position.clone();
  assert(bounded.equals(home) && camera.locked.quaternion.equals(homeRotation), 'right-drag moved the player camera');
  for (let i = 0; i < 5; i++) {
    camera.toggle(); camera.toggle();
    camera.pointerDown({ pointerId: 1, button: 2, clientX: 0, clientY: 0 });
    camera.pointerMove({ pointerId: 1, clientX: 10000, clientY: 10000 });
    camera.pointerUp();
  }
  assert(camera.locked.position.distanceTo(bounded) < 1e-10, 'toggling cameras accumulates orbit');
  camera.key('KeyR');
  assert(camera.locked.position.distanceTo(home) < 1e-10, 'home position changed');
  const before = camera.locked.rotation.y;
  camera.key('ArrowLeft');
  assert(Math.abs(camera.locked.rotation.y - before - Math.PI / 4) < 1e-10, '45 degree turn failed');
  camera.setBlocked(true);
  assert(camera.key('Space') === false && camera.isLocked, 'modal permits camera toggle');
  camera.dispose(); canvas.remove();
});

await test('empty room does not corrupt camera bounds', () => {
  const canvas = document.createElement('canvas');
  const cameras = createCameras(canvas, () => {});
  const position = cameras.free.position.clone();
  cameras.frame(new THREE.Group());
  assert(cameras.free.position.equals(position), 'empty scene moved camera');
  cameras.dispose();
});

await test('menu opens, closes, and preserves shared geometry and materials', () => {
  const controller = new AbortController();
  const menu = createMenu({ pieces, invalidate() {}, signal: controller.signal, onChange() {} });
  const model = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  model.name = 'Fortnite';
  let disposed = false;
  model.geometry.addEventListener('dispose', () => { disposed = true; });
  for (let i = 0; i < 3; i++) {
    menu.open('Fortnite', model); menu.render(false);
    assert(menu.isOpen && document.getElementById('objectMenuTitle').textContent === pieces.get('Fortnite').name, 'menu did not open');
    const link = document.getElementById('objectMenuDetails');
    assert(link.href.endsWith('/pieces/fortnite/'), 'wrong piece page');
    assert(document.getElementById('objectMenuBody').hidden, 'blank description should be hidden');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }));
    assert(document.activeElement === link, 'details link is not keyboard accessible');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', shiftKey: true }));
    assert(document.activeElement.id === 'objectMenuClose', 'reverse focus traversal failed');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    assert(!menu.isOpen && !disposed, 'closing disposed shared geometry');
  }
  menu.dispose(); controller.abort(); model.geometry.dispose(); model.material.dispose();
});

await test('resource owner releases shared resources once', () => {
  const owner = createResourceOwner();
  const texture = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const geometry = new THREE.BoxGeometry();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  let geometryCount = 0, materialCount = 0, textureCount = 0, skeletonCount = 0;
  const skeleton = { dispose() { skeletonCount++; } };
  for (const child of group.children) child.skeleton = skeleton;
  geometry.addEventListener('dispose', () => geometryCount++);
  material.addEventListener('dispose', () => materialCount++);
  texture.addEventListener('dispose', () => textureCount++);
  owner.track(group); owner.track(group); owner.dispose(); owner.dispose();
  assert(geometryCount === 1 && materialCount === 1 && textureCount === 1 && skeletonCount === 1, 'resources disposed repeatedly');
});

await test('post header shows creation date and each description line is safe greentext', () => {
  const controller = new AbortController();
  const edited = new Map(pieces);
  edited.set('Toilet', { ...pieces.get('Toilet'), createdAt: '' });
  edited.set('Fortnite', { ...pieces.get('Fortnite'), createdAt: '2025-07-16', description: 'First line\n>Second line\n<img src=x onerror=alert(1)>' });
  const menu = createMenu({ pieces: edited, invalidate() {}, signal: controller.signal, onChange() {} });
  const model = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  model.name = 'Fortnite';
  try {
    menu.open('Fortnite', model);
    assert(document.getElementById('objectMenuDate').textContent.startsWith('07/16/25(Wed)'), 'creation date missing');
    const body = document.getElementById('objectMenuBody');
    assert(body.children.length === 3 && [...body.children].every(row => row.textContent.startsWith('>')), 'description lines not prefixed');
    assert(body.children[1].textContent === '>Second line' && !body.querySelector('img'), 'description was duplicated or treated as HTML');
    edited.set('Fortnite', { ...edited.get('Fortnite'), description: 'Live edit', createdAt: '2024-02-29' });
    window.dispatchEvent(new Event('piece-content-changed'));
    assert(body.textContent === '>Live edit' && document.getElementById('objectMenuDate').textContent.startsWith('02/29/24(Thu)'), 'open preview did not update live');
    edited.set('Fortnite', { ...edited.get('Fortnite'), description: 'First\n\n//\nSecond\n   \nThird' });
    window.dispatchEvent(new Event('piece-content-changed'));
    assert(body.children[1].textContent === '', 'blank line has a leader');
    const reply = document.querySelector('.previewReply');
    assert(reply && reply.querySelector('.greentextLine').textContent === '>Second', 'second post missing');
    assert(reply.querySelector('.postAuthor').textContent === 'Anonymous', 'reply header missing');
    assert(reply.querySelectorAll('.greentextLine')[1].textContent === '', 'reply blank line has a leader');
    menu.close();
    menu.open('Toilet', model);
    assert(document.querySelector('.previewReplies').hidden, 'previous replies leaked into next object');
    assert(/^\d{2}:\d{2}:\d{2} No\.\d{8}$/.test(document.getElementById('objectMenuDate').textContent), 'missing random post tag or previous piece date leaked');
  } finally {
    menu.close(); menu.dispose(); controller.abort(); model.geometry.dispose(); model.material.dispose();
  }
});

await test('an open preview rerenders when its saved orientation changes', () => {
  const controller = new AbortController();
  const menu = createMenu({ pieces, invalidate() {}, signal: controller.signal, onChange() {} });
  const model = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.3), new THREE.MeshStandardMaterial({ color: 0x88bbdd }));
  model.name = 'Fortnite';
  const original = orientations.Fortnite;
  try {
    menu.open('Fortnite', model);
    menu.render(false);
    const canvas = document.getElementById('objectMenuCanvas');
    const before = canvas.toDataURL();
    orientations.Fortnite = [0, Math.PI / 2, 0];
    window.dispatchEvent(new Event('preview-orientations-changed'));
    menu.render(false);
    assert(canvas.toDataURL() !== before, 'open preview retained its old pose');
    assert(menu.isOpen, 'refresh closed the preview');
  } finally {
    orientations.Fortnite = original;
    menu.close(); menu.dispose(); controller.abort();
    model.geometry.dispose(); model.material.dispose();
  }
});

await test('real GLB 404 appears on screen and queue continues', async () => {
  const loader = new GLTFLoader();
  const failure = { name: 'Missing model test', file: './intentionally-missing.glb' };
  let continued = false;
  await loadSequentially([failure, { name: 'Next item' }], item => item.file ? loader.loadAsync(item.file) : Promise.resolve(), {
    onLoaded() { continued = true; },
    onError(item, error) { reportError(item.name, item.file, error); },
  });
  assert(continued, 'queue stopped');
  assert(!document.getElementById('assetErrors').hidden, 'error is hidden');
  assert(document.getElementById('assetErrorList').textContent.includes(failure.file), 'filename absent');
});


await test('fixed previews ignore scene rotations and correct wall and floor objects', () => {
  const reference = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  const preview = reference.clone();
  for (const name of ['Window', 'Trump', 'American Spirit', 'JD', 'Trotsky']) {
    reference.name = preview.name = name;
    reference.rotation.set(0.7, 1.2, 2.1);
    alignPreview(preview, reference);
    assert(preview.quaternion.angleTo(new THREE.Quaternion()) < 1e-6, `${name} inherited room rotation`);
    reference.rotation.set(-1, -2, -3);
    alignPreview(preview, reference);
    assert(preview.quaternion.angleTo(new THREE.Quaternion()) < 1e-6, `${name} changed with scene pose`);
  }
  reference.name = preview.name = 'Toilet';
  alignPreview(preview, reference);
  const expected = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 3 * Math.PI / 2, 0));
  assert(preview.quaternion.angleTo(expected) < 1e-6, 'toilet did not turn around its vertical axis');
  reference.geometry.dispose(); reference.material.dispose();
});

await test('preview drag never exceeds 15 degrees after repeated drags', () => {
  const group = new THREE.Group();
  for (let i = 0; i < 20; i++) rotatePreview(group, 1, 1);
  assert(group.rotation.x === PREVIEW_ROTATION_LIMIT && group.rotation.y === PREVIEW_ROTATION_LIMIT, 'positive limit exceeded');
  for (let i = 0; i < 20; i++) rotatePreview(group, -1, -1);
  assert(group.rotation.x === -PREVIEW_ROTATION_LIMIT && group.rotation.y === -PREVIEW_ROTATION_LIMIT, 'negative limit exceeded');
  rotatePreview(group, 0.1, 0.1);
  assert(group.rotation.x > -PREVIEW_ROTATION_LIMIT, 'cannot rotate back from limit');
});

await test('hover keeps background and object interior lighting unchanged', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x555555);
  const object = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0x888888 }));
  scene.add(object, new THREE.HemisphereLight(0xffffff, 0xffffff, 1));
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.z = 3;
  const view = createRendering(scene);
  view.resize(128, 128);
  function sample() {
    const gl = view.renderer.getContext();
    const pixel = new Uint8Array(8);
    gl.readPixels(2, 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel.subarray(0, 4));
    gl.readPixels(gl.drawingBufferWidth / 2, gl.drawingBufferHeight / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel.subarray(4));
    return pixel;
  }
  view.renderer.render(scene, camera);
  const direct = sample();
  view.render(camera, null);
  const idle = sample();
  view.render(camera, object);
  const hover = sample();
  for (let i = 0; i < 8; i++) {
    assert(Math.abs(idle[i] - hover[i]) <= 2, `hover changes channel ${i}: ${idle[i]} -> ${hover[i]}`);
    assert(Math.abs(direct[i] - idle[i]) <= 2, `pipeline brightness differs from direct rendering: ${direct[i]} -> ${idle[i]}`);
  }
  view.dispose(); object.geometry.dispose(); object.material.dispose();
});

await test('videos fetch at spawn and attempt playback without opening a preview', async () => {
  const createElement = document.createElement.bind(document);
  const videos = [];
  document.createElement = function(tag, ...args) {
    if (tag !== 'video') return createElement(tag, ...args);
    const video = new EventTarget();
    Object.assign(video, {
      readyState: 0, paused: true, ended: false, loads: 0, plays: 0,
      setAttribute() {}, removeAttribute() {},
      load() { this.loads++; },
      play() { this.plays++; this.paused = false; return Promise.resolve(); },
      pause() { this.paused = true; },
    });
    videos.push(video);
    return video;
  };
  const controller = new AbortController();
  const resources = createResourceOwner();
  const media = createMedia({ resources, signal: controller.signal, invalidate() {} });
  const model = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  try {
    media.attach('White TV', model);
    assert(videos[0].src === 'pieces/white-tv/TV Dinner.mp4' && videos[0].loads === 1 && videos[0].preload === 'auto', 'spawn did not fetch video');
    if (document.hidden) media.visibility(false);
    assert(videos[0].plays === 1 && videos[0].muted, 'spawn did not start muted playback');
    media.attach('White TV', model);
    assert(videos.length === 1, 'duplicate media attachment');
    // Visibility events occur in a later task, after the play promise settles.
    await new Promise(resolve => setTimeout(resolve, 0));
    media.visibility(true); media.visibility(true); media.visibility(false);
    assert(videos[0].plays === 2, 'hidden-tab playback did not resume');
  } finally {
    controller.abort(); media.dispose(); resources.dispose();
    model.geometry.dispose(); model.material.dispose();
    document.createElement = createElement;
  }
});
results.textContent += `\n${count} browser regression tests passed.`;
