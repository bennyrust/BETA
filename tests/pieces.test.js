import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { sceneObjects, imageObjects } from '../js/config.js';
import { createPieceCatalog, piecePageUrl, formatCreationDate } from '../js/pieces.js';

const records = JSON.parse(await readFile(new URL('../pieces/pieces.json', import.meta.url), 'utf8'));

test('creation dates format without timezone drift or invented dates', () => {
  assert.equal(formatCreationDate('2025-07-16'), '07/16/25(Wed)');
  assert.equal(formatCreationDate('2024-02-29'), '02/29/24(Thu)');
  for (const value of ['', undefined, '2025-02-29', 'not a date']) assert.equal(formatCreationDate(value), '');
});

test('every room object resolves to an existing unique piece page', async () => {
  const catalog = createPieceCatalog(records);
  for (const object of [...sceneObjects, ...imageObjects]) {
    const piece = catalog.get(object.name);
    assert.ok(piece, `No piece for ${object.name}`);
    assert.ok(piece.assets.includes(object.file), `Missing source asset for ${object.name}`);
    const html = await readFile(new URL('index.html', piecePageUrl(piece)), 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/);
    if (piece.id === 'trump') assert.ok(html.includes('../../js/bowling.js'));
    const customPage=['laptop','print','trump','consumption-log'].includes(piece.id);
    if(customPage){assert.ok(html.includes('Back to the room'));continue;}
    assert.match(html, /<h1(?:\s[^>]*)?>/);
    assert.ok(html.includes('../../js/piece-page.js') || html.includes('../../js/vapes-gallery.js') || html.includes('../../js/totem-entry.js') || html.includes('../../js/buddyologies.js'));
    assert.ok(html.includes('href="../../index.html?view=player"'));
    assert.ok(html.includes('<article aria-label="Piece documentation"></article>'));
  }
  assert.equal(catalog.get('GTA TV (no stand)'), catalog.get('GTA with Stand'));
  assert.ok(records.some(piece => piece.id === 'nyan-cat'));
});

test('piece catalog rejects ambiguous names and unsafe routes', () => {
  const piece = records[0];
  assert.throws(() => createPieceCatalog([piece, piece]), /duplicate piece ID/);
  assert.throws(() => createPieceCatalog([{ ...piece, id: '../escape' }]), /Invalid/);
  assert.throws(() => createPieceCatalog([piece, { ...piece, id: 'other' }]), /Duplicate piece name/);
});

test('renaming preserves scene lookups and allows shared display names', () => {
  const renamed = records.map(piece => ({ ...piece, sceneName: piece.sceneName ?? piece.name, name: 'New title' }));
  const catalog = createPieceCatalog(renamed);
  for (const object of [...sceneObjects, ...imageObjects]) {
    assert.equal(catalog.get(object.name).name, 'New title');
  }
});


test('every catalog asset uses its piece repository and appears in its file library', async () => {
  const used = new Set();
  for (const piece of records) {
    const prefix = `pieces/${piece.repositoryId ?? piece.id}/`;
    const manifest = JSON.parse(await readFile(new URL(`../${prefix}files.json`, import.meta.url), 'utf8'));
    for (const asset of piece.assets) {
      assert.ok(asset.startsWith(prefix), `Noncanonical path: ${asset}`);
      assert.ok(!used.has(asset), `Asset assigned twice: ${asset}`);
      used.add(asset);
      assert.ok(manifest.some(entry => entry.file === asset.slice(prefix.length)), `Missing library entry: ${asset}`);
      assert.ok((await stat(new URL(`../${asset}`, import.meta.url))).isFile());
    }
  }
});

test('TV Dinner objects share the White TV installation route without moving source assets', () => {
  const catalog = createPieceCatalog(records);
  const urls = ['White TV', 'GTA with Stand', 'Toilet'].map(name => piecePageUrl(catalog.get(name)));
  assert.equal(new Set(urls).size, 1);
  assert.ok(urls[0].endsWith('/pieces/white-tv/'));
  assert.equal(catalog.get('GTA TV (no stand)'), catalog.get('GTA with Stand'));
  assert.ok(catalog.get('Toilet').assets.some(path => path.startsWith('pieces/toilet/')));
});

test('all four figures share the Buddyologies opening page', () => {
 const catalog=createPieceCatalog(records);
 const urls=['Luigi','Crooks','Tetsuya','Rittenhouse'].map(name=>piecePageUrl(catalog.get(name)));
 assert.equal(new Set(urls).size,1);assert.ok(urls[0].endsWith('/pieces/Buddyologies/'));
});
