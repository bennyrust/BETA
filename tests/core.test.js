import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { prioritize, loadSequentially, createRenderScheduler, fitDistance, isClick } from '../js/core.js';
import { sceneObjects, imageObjects, loadPriority } from '../js/config.js';

test('all scene asset paths exist, including Fortnite', () => {
  for (const item of [...sceneObjects, ...imageObjects]) assert.ok(existsSync(new URL(`../${item.file}`, import.meta.url)), item.file);
  assert.equal(sceneObjects.find(item => item.name === 'Fortnite').file, 'pieces/fortnite/Fortnite good-2048.glb');
});

test('priority queue preserves the remaining order without mutating scene config', () => {
  const snapshot = [...sceneObjects];
  const queue = prioritize(sceneObjects, loadPriority);
  assert.deepEqual(queue.slice(0, 3).map(item => item.name), loadPriority);
  assert.deepEqual(queue.slice(3), sceneObjects.filter(item => !loadPriority.includes(item.name)));
  assert.deepEqual(sceneObjects, snapshot);
});

test('failed requests and setup failures do not stop subsequent assets', async () => {
  const loaded = [], failed = [];
  let active = 0;
  await loadSequentially([1, 2, 3, 4], async item => {
    assert.equal(active++, 0);
    await Promise.resolve();
    active--;
    if (item === 2) throw new Error('404');
    return item;
  }, {
    onLoaded(item) { if (item === 3) throw new Error('setup failed'); loaded.push(item); },
    onError(item, error) { failed.push([item, error.message]); },
  });
  assert.deepEqual(loaded, [1, 4]);
  assert.deepEqual(failed, [[2, '404'], [3, 'setup failed']]);
});

test('disposal stops starting additional asset requests', async () => {
  const controller = new AbortController();
  const loaded = [];
  await loadSequentially([1, 2], async item => { controller.abort(); loaded.push(item); }, { signal: controller.signal });
  assert.deepEqual(loaded, [1]);
});

test('render scheduler coalesces updates, idles, animates only when requested, and cancels', () => {
  const callbacks = new Map();
  let id = 0, renders = 0, playing = false;
  const scheduler = createRenderScheduler(() => { renders++; return playing; }, callback => { callbacks.set(++id, callback); return id; }, key => callbacks.delete(key));
  function tick() { const [key, callback] = callbacks.entries().next().value; callbacks.delete(key); callback(); }
  scheduler.invalidate(); scheduler.invalidate();
  assert.equal(callbacks.size, 1);
  tick();
  assert.equal(renders, 1); assert.equal(callbacks.size, 0);
  playing = true; scheduler.invalidate(); tick();
  assert.equal(callbacks.size, 1);
  playing = false; tick(); assert.equal(callbacks.size, 0);
  scheduler.invalidate(); scheduler.dispose(); scheduler.invalidate();
  assert.equal(callbacks.size, 0);
});

test('portrait preview fitting accounts for horizontal field of view and model depth', () => {
  const size = { x: 4, y: 2, z: 2 };
  const wide = fitDistance(size, 45, 2);
  const narrow = fitDistance(size, 45, 0.5);
  assert.ok(narrow > wide);
  const distance = fitDistance(size, 45, 0.5, 1);
  assert.ok((distance - size.z / 2) * Math.tan(Math.PI / 8) * 0.5 >= size.x / 2 - 1e-10);
});

test('click threshold separates a click from a camera drag', () => {
  assert.ok(isClick({ x: 5, y: 5 }, { x: 8, y: 9 }));
  assert.equal(isClick({ x: 5, y: 5 }, { x: 15, y: 5 }), false);
});

test('resource ownership deduplicates shared GPU assets and skeletons', async () => {
  const { createResourceOwner } = await import('../js/resources.js');
  const counts = { geometry: 0, material: 0, texture: 0, skeleton: 0, image: 0 };
  const geometry = { dispose() { counts.geometry++; } };
  const texture = { isTexture: true, image: { close() { counts.image++; } }, dispose() { counts.texture++; } };
  const material = { map: texture, dispose() { counts.material++; } };
  const skeleton = { dispose() { counts.skeleton++; } };
  const node = { geometry, material: [material, material], skeleton };
  const owner = createResourceOwner();
  owner.track({ traverse(visit) { visit(node); visit(node); } });
  owner.dispose(); owner.dispose();
  assert.deepEqual(counts, { geometry: 1, material: 1, texture: 1, skeleton: 1, image: 1 });
});

test('every selectable object and alternate model has a deliberate preview orientation', async () => {
  const { selectableNames } = await import('../js/config.js');
  const { previewOrientations } = await import('../js/preview-config.js');
  for (const name of [...selectableNames, 'GTA TV (no stand)']) {
    assert.equal(previewOrientations[name]?.length, 3, name);
    assert.ok(previewOrientations[name].every(Number.isFinite), name);
  }
});
