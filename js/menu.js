import * as THREE from 'three';
import { splitPosts, greentext } from './post-text.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { maxPixelRatio } from './config.js';
import { alignPreview, rotatePreview, PREVIEW_ROTATION_LIMIT } from './preview.js';
import { piecePageUrl, formatCreationDate } from './pieces.js';

export function createMenu({ pieces, invalidate, signal, onChange, releaseRendererOnClose = false }) {
  const overlay = document.getElementById('objectMenuOverlay');
  const canvas = document.getElementById('objectMenuCanvas');
  const closeButton = document.getElementById('objectMenuClose');
  const detailsLink = document.getElementById('objectMenuDetails');
  document.getElementById('objectMenuHeader').append(detailsLink);
  const description = document.getElementById('objectMenuBody');
  const replies = document.createElement('div');
  replies.className = 'previewReplies';
  document.getElementById('objectMenuRight').append(replies);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.9));
  const light = new THREE.DirectionalLight(0xffffff, 1.1);
  light.position.set(2, 3, 4);
  scene.add(light);
  let renderer, group, drag, previousFocus, currentReference, currentName;
  let width = 0, height = 0, dirty = false;
  let fitSize = new THREE.Vector3(1, 1, 1);

  const postTags = new Map();
  function postTag(piece, index = 0) {
    const key = `${piece.id}:${index}`;
    if (!postTags.has(key)) {
      const random = new Uint32Array(4);
      crypto.getRandomValues(random);
      const time = [random[0] % 24, random[1] % 60, random[2] % 60].map(n => String(n).padStart(2, '0')).join(':');
      postTags.set(key, `${time} No.${10000000 + random[3] % 90000000}`);
    }
    return postTags.get(key);
  }
  function updateText(piece) {
      document.getElementById('objectMenuTitle').textContent = piece.name;
      const posts = splitPosts(piece.description);
      const rows = lines => lines.map(line => {
        const row = document.createElement('span');
        row.className = 'greentextLine';
        row.textContent = greentext(line);
        return row;
      });
      description.replaceChildren(...rows(posts[0]));
      description.hidden = !posts[0].some(line => line.trim());
      replies.replaceChildren(...posts.slice(1).map((lines, index) => {
        const post = document.createElement('section');
        post.className = 'previewReply';
        post.setAttribute('aria-label', `Post ${index + 2}`);
        const header = document.createElement('header');
        header.className = 'replyHeader';
        const author = document.createElement('span');
        author.className = 'postAuthor';
        author.textContent = 'Anonymous';
        const date = document.createElement('time');
        date.className = 'replyDate';
        date.textContent = `${formatCreationDate(piece.createdAt)}${postTag(piece, index + 1)}`;
        if (formatCreationDate(piece.createdAt)) date.dateTime = piece.createdAt;
        header.append(author, date);
        const body = document.createElement('div');
        body.className = 'replyBody';
        body.append(...rows(lines));
        post.append(header, body);
        return post;
      }));
      replies.hidden = posts.length === 1;
      const date = document.getElementById('objectMenuDate');
      const creationDate = formatCreationDate(piece.createdAt);
      date.textContent = `${creationDate}${postTag(piece)}`;
      date.hidden = false;
      date.dateTime = creationDate ? piece.createdAt : '';
      detailsLink.href = piecePageUrl(piece);
      // Distinct URLs allow genuine nested room/branch instances in Chromium.
      if(window.self!==window.top){const url=new URL(detailsLink.href);url.searchParams.set('instance',crypto.randomUUID());detailsLink.href=url.href;}
      detailsLink.setAttribute('aria-label', `More about ${piece.name}`);
  }
  window.addEventListener('piece-content-changed', () => {
    if (!overlay.hidden && currentName) updateText(pieces.get(currentName));
  }, { signal });
  function clear() {
    if (!group) return;
    // Geometry, materials, and textures belong to the main scene. Only cloned skeletons are owned here.
    const skeletons = new Set();
    group.traverse(node => { if (node.skeleton) skeletons.add(node.skeleton); });
    for (const skeleton of skeletons) skeleton.dispose();
    scene.remove(group);
    group = null;
    renderer?.renderLists.dispose();
  }
  function fit() {
    // Fit the visible box instead of its much larger diagonal sphere.
    // Include the drag extremes so the larger preview still stays in frame.
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanX = tanY * camera.aspect;
    let distance = 0.01;
    const point = new THREE.Vector3();
    const rotation = new THREE.Euler();
    for (const pitch of [-PREVIEW_ROTATION_LIMIT, 0, PREVIEW_ROTATION_LIMIT]) {
      for (const yaw of [-PREVIEW_ROTATION_LIMIT, 0, PREVIEW_ROTATION_LIMIT]) {
        rotation.set(pitch, yaw, 0);
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
          point.set(x * fitSize.x / 2, y * fitSize.y / 2, z * fitSize.z / 2).applyEuler(rotation);
          distance = Math.max(distance, Math.abs(point.x) / tanX + point.z, Math.abs(point.y) / tanY + point.z);
        }
      }
    }
    distance *= 1.06;
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.near = Math.max(distance / 1000, 0.0001);
    camera.far = Math.max(distance * 100, 100);
    camera.updateProjectionMatrix();
  }
  function positionPreview(object, reference) {
    alignPreview(object, reference);
    const box = new THREE.Box3().setFromObject(object);
    if (!box.isEmpty()) {
      object.position.sub(box.getCenter(new THREE.Vector3()));
      box.getSize(fitSize);
    }
  }
  let pendingOrientation = false;
  function refreshPreviewOrientation() {
    if (!group || overlay.hidden) return;
    if (drag) { pendingOrientation = true; return; }
    pendingOrientation = false;
    group.rotation.set(0, 0, 0);
    group.updateWorldMatrix(true, true);
    positionPreview(group.children[0], currentReference);
    fit();
    drag = null;
    dirty = true;
    invalidate();
  }
  window.addEventListener('preview-orientations-changed', refreshPreviewOrientation, { signal });
  function resize() {
    if (overlay.hidden) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width)), h = Math.max(1, Math.floor(rect.height));
    const ratio = Math.min(devicePixelRatio || 1, maxPixelRatio);
    if (w === width && h === height && renderer.getPixelRatio() === ratio) return;
    width = w; height = h;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fit();
    dirty = true;
  }
  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    drag = null;
    clear();
    if (releaseRendererOnClose && renderer) {
      renderer.dispose(); renderer = null;
      width = 0; height = 0;
    }
    onChange(false);
    previousFocus?.focus();
    invalidate();
  }
  closeButton.addEventListener('click', close, { signal });
  overlay.addEventListener('pointerdown', event => { if (event.target === overlay) close(); }, { signal });
  window.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.code === 'Escape') { event.preventDefault(); close(); }
    if (event.code === 'Tab') {
      const controls = [closeButton, detailsLink];
      const index = controls.indexOf(document.activeElement);
      const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0)
        : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      event.preventDefault();
      controls[next].focus();
    }
    event.stopPropagation();
  }, { signal });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  }, { signal });
  window.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || !group) return;
    rotatePreview(group, (event.clientY - drag.y) * 0.01, (event.clientX - drag.x) * 0.01);
    drag.x = event.clientX; drag.y = event.clientY;
    dirty = true;
    invalidate();
  }, { signal });
  function end(event) {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    if (group) group.rotation.set(0, 0, 0);
    if (pendingOrientation) refreshPreviewOrientation();
    dirty = true;
    invalidate();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, end, { signal });
  window.addEventListener('blur', () => { if (drag) end({ pointerId: drag.id }); }, { signal });

  return {
    get isOpen() { return !overlay.hidden; },
    open(name, source, reference = source) {
      const piece = pieces.get(name);
      if (!piece) throw new Error(`Missing piece record: ${name}`);
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      previousFocus = document.activeElement;
      clear();
      const object = clone(source);
      if (name === 'Trump' || reference.name === 'Trump') object.getObjectByName('Nyan Cat')?.removeFromParent();
      currentReference = reference;
      positionPreview(object, reference);
      group = new THREE.Group();
      group.add(object);
      scene.add(group);
      overlay.hidden = false;
      currentName = name;
      updateText(piece);
      resize();
      fit();
      dirty = true;
      closeButton.focus();
      onChange(true);
      invalidate();
    },
    close,
    resize() { resize(); invalidate(); },
    render(videoPlaying) {
      if (overlay.hidden) return;
      if (dirty || videoPlaying) { renderer.render(scene, camera); dirty = false; }
    },
    dispose() { clear(); replies.remove(); renderer?.dispose(); },
  };
}
