import { varyVape } from './vape-variation.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sceneObjects, imageObjects } from './config.js';
import { previewOrientations } from './preview-config.js';
import { orientations, refreshOrientations } from './orientation-store.js';
import { createResourceOwner } from './resources.js';
import { fitDistance } from './core.js';

await refreshOrientations();
const gallery = document.getElementById('gallery');
const progress = document.getElementById('progress');
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
renderer.setSize(360, 280);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.9));
const light = new THREE.DirectionalLight(0xffffff, 1.1);
light.position.set(2, 3, 4);
scene.add(light);
const camera = new THREE.PerspectiveCamera(45, 360 / 280, 0.001, 1000);
const loader = new GLTFLoader();
const textures = new THREE.TextureLoader();
let active, selection = 0, loading, saveQueue = Promise.resolve(), pendingSaves = 0;
const items = [];

async function load(config) {
  const owner = createResourceOwner();
  try {
    let model;
    if (config.file.endsWith('.glb')) {
      model = (await loader.loadAsync(new URL(`../${config.file}`, import.meta.url).href)).scene;
      varyVape(model,config.file);
      owner.track(model);
      model.scale.setScalar(config.scale ?? 1);
    } else {
      const texture = await textures.loadAsync(new URL(`../${config.file}`, import.meta.url).href);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      const height = 0.75 * 0.75;
      model = new THREE.Mesh(new THREE.PlaneGeometry(height * texture.image.width / texture.image.height, height),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
      owner.track(model);
    }
    return { model, owner };
  } catch (error) { owner.dispose(); throw error; }
}

function draw(item, model) {
  model.position.set(0, 0, 0);
  model.rotation.set(...item.rotation, 'XYZ');
  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const diameter = box.getSize(new THREE.Vector3()).length() || 1;
  const distance = Math.max(0.01, fitDistance(new THREE.Vector3(diameter, diameter, 0), 45, 360 / 280));
  camera.position.set(0, 0, distance);
  camera.near = Math.max(distance / 1000, 0.0001);
  camera.far = Math.max(distance * 100, 100);
  camera.updateProjectionMatrix();
  scene.add(model);
  renderer.render(scene, camera);
  const context = item.canvas.getContext('2d');
  context.clearRect(0, 0, 360, 280);
  context.drawImage(renderer.domElement, 0, 0);
  scene.remove(model);
  renderer.renderLists.dispose();
  item.pose.textContent = item.rotation.map((r, i) => `${['X', 'Y', 'Z'][i]} ${Math.round(THREE.MathUtils.radToDeg(r))}°`).join('   /   ');
}

function status(item, message, failed = false) {
  item.status.textContent = message;
  item.status.classList.toggle('failed', failed);
}

async function select(item) {
  if (active?.item === item) return active.model;
  if (loading?.item === item) return loading.promise;
  const token = ++selection;
  active?.item.card.classList.remove('selected');
  active?.owner.dispose();
  active = null;
  status(item, 'Loading for editing…');
  const promise = load(item.config).then(resource => {
    if (token !== selection) { resource.owner.dispose(); return null; }
    active = { item, ...resource };
    item.card.classList.add('selected');
    status(item, item.dirty ? 'Unsaved changes — use Retry save.' : 'Ready to drag · Shift-drag to roll');
    draw(item, resource.model);
    return resource.model;
  }).catch(error => { status(item, `Could not load: ${error.message}. Click to retry.`, true); return null; })
    .finally(() => { if (loading?.promise === promise) loading = null; });
  loading = { item, promise };
  return promise;
}

function save(item) {
  const rotation = [...item.rotation];
  const version = ++item.version;
  item.dirty = true;
  pendingSaves++;
  status(item, 'Saving…');
  saveQueue = saveQueue.then(async () => {
    try {
      const response = await fetch('./api/preview-orientations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.config.name, rotation }),
      });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      if (version === item.version) { item.dirty = false; status(item, 'Saved · live in the room'); }
    } catch (error) {
      if (version === item.version) status(item, `${error.message}. Not saved — run scripts/serve.py and Retry save.`, true);
    } finally { pendingSaves--; }
  });
}

function remember(item) { item.history.push([...item.rotation]); if (item.history.length > 50) item.history.shift(); }
function rotate(item, axis, radians) {
  item.version++;
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...item.rotation, 'XYZ'));
  quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, radians));
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  item.rotation = [euler.x, euler.y, euler.z];
  draw(item, active.model);
}

const vapeRecords = (await (await fetch('./pieces/pieces.json')).json()).filter(p => p.pageId === 'vapes' && p.id !== 'vapes' && !sceneObjects.some(c => c.name === p.sceneName));
const extraVapes = vapeRecords.map(p => ({ name: p.sceneName, file: p.assets[0], scale: 1 }));
const configurations = [...sceneObjects.filter(c => !c.menuOnly).map(c => c.name === 'GTA with Stand'
  ? { ...sceneObjects.find(other => other.name === 'GTA TV (no stand)'), label: c.name } : c), ...imageObjects, ...extraVapes];
for (const config of configurations) {
  const card = document.createElement('article');
  const title = document.createElement('h2'); title.textContent = config.label || config.name;
  const pose = document.createElement('p'); pose.className = 'pose';
  const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 280; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', `${title.textContent} orientation. Drag or use arrow keys to rotate; Shift-drag to roll.`);
  const fields = document.createElement('fieldset');
  const note = document.createElement('span'); note.className = 'status'; note.setAttribute('role', 'status');
  card.append(title, pose, canvas, fields, note); gallery.append(card);
  const item = { config, card, canvas, pose, status: note, rotation: [...orientations[config.name]], history: [], version: 0, dirty: false };
  items.push(item);
  status(item, 'Loading thumbnail…');
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  for (const [index, label] of ['Tilt · X', 'Turn · Y', 'Roll · Z'].entries()) {
    const row = document.createElement('div'); row.className = 'axis';
    const text = document.createElement('span'); text.textContent = label; row.append(text);
    for (const sign of [-1, 1]) {
      const button = document.createElement('button'); button.textContent = `${sign < 0 ? '−' : '+'}30°`;
      button.setAttribute('aria-label', `${title.textContent}: ${label} ${sign * 30} degrees`);
      button.onclick = async () => { if (!await select(item)) return; remember(item); rotate(item, axes[index], sign * Math.PI / 6); save(item); };
      row.append(button);
    }
    fields.append(row);
  }
  const actions = document.createElement('div'); actions.className = 'actions'; fields.append(actions);
  for (const label of ['Undo', 'Reset', 'Retry save']) {
    const button = document.createElement('button'); button.textContent = label;
    button.onclick = async () => {
      if (!await select(item)) return;
      if (label === 'Undo') { if (!item.history.length) return; item.rotation = item.history.pop(); }
      if (label === 'Reset') { remember(item); item.rotation = [...(previewOrientations[config.name] || [0, 0, 0])]; }
      draw(item, active.model); save(item);
    };
    actions.append(button);
  }
  let drag;
  function applyDrag(gesture) {
    if (active?.item !== item || !gesture.moves.length) return;
    if (!gesture.changed) remember(item);
    gesture.changed = true;
    for (const { dx, dy, roll } of gesture.moves.splice(0)) {
      if (roll) rotate(item, axes[2], -dx * 0.01);
      else { rotate(item, axes[1], dx * 0.01); rotate(item, axes[0], dy * 0.01); }
    }
    item.dirty = true;
    status(item, 'Editing… release to save');
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    canvas.setPointerCapture(event.pointerId);
    canvas.focus();
    const gesture = drag = { id: event.pointerId, x: event.clientX, y: event.clientY, changed: false, moves: [] };
    select(item).then(model => { if (model && drag === gesture) applyDrag(gesture); });
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!dx && !dy) return;
    drag.moves.push({ dx, dy, roll: event.shiftKey });
    drag.x = event.clientX; drag.y = event.clientY;
    applyDrag(drag);
  });
  async function end(event) {
    if (drag?.id !== event.pointerId) return;
    const gesture = drag; drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (gesture.moves.length && await select(item)) applyDrag(gesture);
    if (gesture.changed) save(item);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, end);
  canvas.addEventListener('keydown', async event => {
    const keys = { ArrowLeft: [1, -1], ArrowRight: [1, 1], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!keys[event.key]) return;
    event.preventDefault();
    if (!await select(item)) return;
    remember(item);
    const [axis, sign] = keys[event.key]; rotate(item, axes[axis], sign * Math.PI / 6); save(item);
  });
}
document.getElementById('search').addEventListener('input', event => {
  for (const item of items) item.card.hidden = !(item.config.label || item.config.name).toLowerCase().includes(event.target.value.toLowerCase());
});
window.addEventListener('beforeunload', event => {
  if (pendingSaves || items.some(item => item.dirty)) { event.preventDefault(); event.returnValue = ''; }
});
let completed = 0, failed = 0;
for (const item of items) {
  let resource;
  try {
    resource = await load(item.config);
    draw(item, resource.model);
    if (active?.item !== item && !item.version) status(item, 'Drag to edit · changes save automatically');
  } catch (error) { failed++; status(item, `Thumbnail failed: ${error.message}. Click to retry.`, true); }
  finally { resource?.owner.dispose(); }
  progress.textContent = `${++completed} / ${items.length} previews loaded${failed ? ` · ${failed} failed` : ''}`;
}
