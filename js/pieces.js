export function createPieceCatalog(records) {
  const catalog = new Map();
  const ids = new Set();
  for (const piece of records) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(piece.id) || ids.has(piece.id)) {
      throw new Error(`Invalid or duplicate piece ID: ${piece.id}`);
    }
    for (const route of [piece.pageId, piece.repositoryId]) { if (route !== undefined && ! /^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(route)) throw new Error('Invalid piece route'); }
    ids.add(piece.id);
    for (const name of [piece.sceneName ?? piece.name, ...piece.aliases]) {
      if (catalog.has(name)) throw new Error(`Duplicate piece name: ${name}`);
      catalog.set(name, piece);
    }
  }
  return catalog;
}

// Share simultaneous catalog requests and reuse the parsed response briefly.
// Return a separate Map because room editors update their own lookup in place.
let catalogPromise,catalogAt=0;
export const contentRefreshMs=5000;
export async function loadPieceCatalog() {
  if(!catalogPromise||Date.now()-catalogAt>=contentRefreshMs){
    catalogAt=Date.now();
    catalogPromise=fetch(new URL('../pieces/pieces.json',import.meta.url),{cache:'no-cache'})
      .then(response=>{if(!response.ok)throw new Error(`Could not load piece catalog (${response.status})`);return response.json();})
      .then(createPieceCatalog).catch(error=>{catalogPromise=null;throw error;});
  }
  return new Map(await catalogPromise);
}

export function piecePageUrl(piece) {
  return new URL(`../pieces/${encodeURIComponent(piece.pageId ?? piece.repositoryId ?? piece.id)}/`, import.meta.url).href;
}

export function formatCreationDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year.slice(-2)}(${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()]})`;
}
