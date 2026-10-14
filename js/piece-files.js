import { openPhoto } from './photo-preview.js';
export function mountPieceFiles(id, repository = id, container = document.querySelector('main'), { photosOnly = false } = {}) {
  const base = new URL(`../pieces/${encodeURIComponent(repository)}/`, import.meta.url);
  const section = document.createElement('section');
  section.className = 'pieceFiles';
  section.innerHTML = `<h2>Files</h2><p>Images, videos, 3D models, and documents for this piece.</p><p class="fileStatus" role="status"></p><div class="fileGrid"></div>`;
  if (photosOnly) {section.querySelector('h2').textContent='Photo gallery';section.querySelector('h2 + p').remove();}
  container.append(section);
  const status = section.querySelector('.fileStatus');
  const grid = section.querySelector('.fileGrid');
  let snapshot = '';
  function size(bytes) { return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
  async function refresh() {
    const response = await fetch(new URL('files.json', base), { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load the file library. Reload to retry.');
    const items = await response.json();
    const serialized = JSON.stringify(items);
    if (serialized === snapshot) return;
    snapshot = serialized;
    grid.replaceChildren();
    if (!items.length) { const empty = document.createElement('p'); empty.textContent = 'No files added yet.'; grid.append(empty); }
    for (const item of items) {
      if (typeof item.file !== 'string' || !item.file || /[\\/\x00-\x1f]/.test(item.file) || item.file === '.' || item.file === '..') continue;
      const isPhoto = /\.(png|jpg|jpeg|gif|webp|avif)$/i.test(item.file);
      if (photosOnly && !isPhoto) continue;
      const card = document.createElement('article');
      card.className = 'fileCard';
      const url = new URL(encodeURIComponent(item.file), base).href;
      const extension = item.file.split('.').pop().toLowerCase();
      let preview;
      if (['png','jpg','jpeg','gif','webp','avif'].includes(extension)) {
        preview = document.createElement('img'); preview.alt = item.name; preview.loading = 'lazy';
      } else if (['mp4','webm','mov'].includes(extension)) {
        preview = document.createElement('video'); preview.controls = true; preview.preload = 'none'; preview.playsInline = true;
      } else if (['mp3','wav','ogg'].includes(extension)) {
        preview = document.createElement('audio'); preview.controls = true; preview.preload = 'none';
      }
      if (preview) {
        preview.src = url;
        preview.addEventListener('error', () => { const note = document.createElement('p'); note.textContent = isPhoto ? 'Photo unavailable.' : 'Preview unavailable in this browser. Download the original below.'; preview.replaceWith(note); }, { once: true });
        card.append(preview);
      }
      if (isPhoto) {
        const trigger=document.createElement('button');trigger.className='photoPreviewTrigger';trigger.type='button';trigger.setAttribute('aria-label','Enlarge photo');trigger.append(preview);trigger.onclick=()=>openPhoto(url,item.name);card.append(trigger);grid.append(card);continue;
      }
      const title = document.createElement('h3'); title.textContent = item.name;
      const meta = document.createElement('p'); meta.textContent = `${(item.name.split('.').pop() || extension).toUpperCase()} · ${size(item.size)}`;
      const link = document.createElement('a'); link.href = url; link.download = item.name; link.textContent = 'Download original';
      card.append(title, meta, link); grid.append(card);
    }
  }
  refresh().catch(error => { status.textContent = error.message; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh().catch(error => { status.textContent = error.message; }); });
}
