import { previewOrientations } from './preview-config.js';

export const orientations = { ...previewOrientations, Room: [0, 0, 0] };
const url = new URL('../pieces/preview-orientations.json', import.meta.url);
export async function refreshOrientations() {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Preview orientations could not load (${response.status})`);
  const values = await response.json();
  for (const [name, rotation] of Object.entries(values)) {
    if (!Object.hasOwn(orientations, name) || !Array.isArray(rotation) || rotation.length !== 3 || !rotation.every(Number.isFinite)) {
      throw new Error(`Invalid preview orientation: ${name}`);
    }
  }
  const changed = Object.entries(values).some(([name, rotation]) =>
    rotation.some((angle, axis) => angle !== orientations[name]?.[axis]));
  Object.assign(orientations, values);
  if (changed) window.dispatchEvent(new Event('preview-orientations-changed'));
}

export function watchOrientations(signal) {
  let pending = false;
  const timer = setInterval(async () => {
    if (pending || document.hidden) return;
    pending = true;
    try { await refreshOrientations(); }
    catch (error) { console.warn('Preview orientation refresh failed:', error); }
    finally { pending = false; }
  }, 1500);
  signal.addEventListener('abort', () => clearInterval(timer), { once: true });
}
