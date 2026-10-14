import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createPieceCatalog } from '../js/pieces.js';

const root = new URL('../', import.meta.url);
const pieces = JSON.parse(await readFile(new URL('pieces/pieces.json', root), 'utf8'));
createPieceCatalog(pieces);
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
for (const piece of pieces) {
  if (['consumption log', 'trump', 'vapes', 'white-tv', 'Buddyologies', 'can-tower', 'print', 'laptop', 'vape machine'].includes(piece.pageId ?? piece.repositoryId ?? piece.id)) continue; // Collection has a custom interactive gallery.
  const directory = new URL(`pieces/${encodeURIComponent(piece.pageId ?? piece.repositoryId ?? piece.id)}/`, root);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), `<!doctype html>
<html lang="en" data-site-loading data-loading-mode="content">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(piece.name)} — 3D Room</title>
  <link rel="stylesheet" href="../piece.css">
  <link rel="stylesheet" href="../../loading.css">
  <script defer src="../../js/loading.js"></script>
</head>
<body>
  <main>
    <nav aria-label="Room"><a href="../../index.html?view=player" aria-label="Back to the room" title="Back to the room" style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;min-height:32px;font-size:28px;line-height:1;text-decoration:none">&lt;</a></nav>
    <h1>${escape(piece.name)}</h1>
    <time id="pieceDate" hidden></time>
    <article aria-label="Piece documentation">${piece.documentation ? `<p>${escape(piece.documentation)}</p>` : ''}</article>
    ${piece.sources ? `<section id="pieceSources" aria-label="Sources"><h2>Sources</h2><p>${escape(piece.sources)}</p></section>` : ''}
  </main>
<script type="module" src="../../js/piece-page.js"></script>
</body>
</html>
`);
}
console.log(`Generated ${pieces.length} piece pages.`);
