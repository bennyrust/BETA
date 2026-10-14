import { mountPieceFiles } from './piece-files.js';
import { loadPieceCatalog, formatCreationDate } from './pieces.js';
const route = decodeURIComponent(location.pathname.split('/').filter(Boolean).filter(part => part !== 'index.html').pop());
let filesMounted = false;
async function update() {
  const catalog = await loadPieceCatalog();
  const entries = [...catalog.values()];
  const piece = entries.find(piece => piece.id === route) ?? entries.find(piece => (piece.pageId ?? piece.repositoryId ?? piece.id) === route);
  if (!piece) throw new Error('Piece not found');
  if (!filesMounted) { mountPieceFiles(piece.id, piece.repositoryId ?? piece.id); filesMounted = true; }
  document.querySelector('h1').textContent = piece.name;
  document.title = `${piece.name} — 3D Room`;
  const article = document.querySelector('article[aria-label="Piece documentation"]');
  if (article.textContent !== piece.documentation) article.textContent = piece.documentation;
  let sources = document.getElementById('pieceSources');
  if (!sources) { sources = document.createElement('section'); sources.id = 'pieceSources'; document.querySelector('main').append(sources); }
  if (sources.dataset.value !== piece.sources) {
    const heading = document.createElement('h2'); heading.textContent = 'Sources';
    const text = document.createElement('p'); text.textContent = piece.sources;
    sources.replaceChildren(heading, text); sources.dataset.value = piece.sources;
  }
  sources.hidden = !piece.sources;
  const date = document.getElementById('pieceDate');
  date.textContent = formatCreationDate(piece.createdAt); date.hidden = !date.textContent;
  date.dateTime = date.hidden ? '' : piece.createdAt;
}
let pending = false;
async function refresh() {
  if (pending) return;
  pending = true;
  try { await update(); window.siteLoading?.finish(); document.getElementById('contentError')?.remove(); }
  catch (error) {
    window.siteLoading?.fail('Could not load this piece. Please retry.');
    let message = document.getElementById('contentError');
    if (!message) { message = document.createElement('p'); message.id = 'contentError'; message.setAttribute('role', 'alert'); document.querySelector('main').append(message); }
    message.textContent = 'Content could not refresh. Check the server connection.';
  } finally { pending = false; }
}
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 1500);
