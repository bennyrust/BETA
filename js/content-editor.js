const definitionsOnly = new URLSearchParams(location.search).get('worksheet') === 'vapes';
const fields = [
  ['name', 'Object name', 'text'],
  ['branchComplete', 'Branch page worked on', 'checkbox', 'Automatically checked when the branch has custom content or functionality beyond its generated starter page.'],
  ['createdAt', 'Date created', 'date'], ['status', 'Status', 'select'],
  ['description', 'Preview description', 'textarea', 'Nonempty lines get >. Empty lines stay blank. Put // on its own line to start a new post.'],
  ['documentation', 'Detailed documentation', 'textarea', 'Appears on this piece’s documentation page.'],
  ['sources', 'Sources / links', 'textarea'], ['notes', 'Working notes', 'textarea', 'Editorial notes; not displayed in the room or piece page.'],
];
if (definitionsOnly) {
  fields.splice(0, fields.length, ['name', 'Flavor name', 'text'], ['definition', 'Your definition', 'textarea', 'Shown in the vape selector. Saves automatically.']);
  document.title = 'Vape definitions worksheet';
  document.querySelector('h1').textContent = 'Vape definitions worksheet';
  document.querySelector('header > p:not(.eyebrow)').textContent = 'Write your definition of each word or flavor. Changes save automatically and update the selector.';
  document.querySelector('#filter').closest('label').hidden = true;
}
const states = [];
const tracker=document.createElement('p');tracker.id='branchProgress';tracker.setAttribute('role','status');
if(!definitionsOnly)document.querySelector('header .filters').before(tracker);
function updateProgress(){
 const pages=new Map(states.map(s=>[s.pageId,s.values.branchComplete]));
 tracker.textContent=`Branch pages completed: ${[...pages.values()].filter(Boolean).length}/${pages.size}`;
}
function showState(state, text, failed = false) {
  state.message.textContent = text;
  state.message.classList.toggle('failed', failed);
  state.badge.textContent = failed ? 'Not saved' : text === 'Saved' ? (state.values.status || 'Saved') : text;
}
function changed(state) { return Object.fromEntries(Object.keys(state.values).filter(key => state.values[key] !== state.base[key]).map(key => [key, state.values[key]])); }
async function save(state) {
  clearTimeout(state.timer);
  if (state.saving) { state.again = true; return; }
  const changes = changed(state);
  if (!Object.keys(changes).length) { showState(state, 'Saved'); return; }
  const invalid = [...state.card.querySelectorAll('input')].find(input => !input.checkValidity());
  if (invalid) { showState(state, invalid.name === 'name' ? 'Enter an object name (up to 200 characters).' : 'Enter a valid creation date.', true); return; }
  state.saving = true;
  showState(state, 'Saving…');
  try {
    const response = await fetch('./api/pieces', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: state.id, changes, base: Object.fromEntries(Object.keys(changes).map(key => [key, state.base[key]])) }),
    });
    if (!response.ok) throw new Error(response.status === 409 ? 'Changed in another editor. Copy your text, then reload.' : `Not saved (${response.status}). Check the local server and retry.`);
    await response.json();
    Object.assign(state.base, changes);
    showState(state, Object.keys(changed(state)).length ? 'Unsaved changes' : 'Saved');
  } catch (error) { state.again = false; showState(state, error.message, true); }
  finally {
    state.saving = false;
    if (state.again) { state.again = false; save(state); }
  }
}
function filter() {
  const search = document.getElementById('search').value.toLowerCase();
  const status = document.getElementById('filter').value;
  let count = 0;
  for (const state of states) {
    state.card.hidden = !state.values.name.toLowerCase().includes(search) || (status !== 'All' && state.values.status !== status);
    if (!state.card.hidden) count++;
  }
  document.getElementById('count').textContent = `${count} of ${states.length} pieces`;
}
async function hasBranchWork(pageId) {
 const response=await fetch(`./pieces/${encodeURIComponent(pageId)}/index.html`,{cache:'no-store'});
 if(!response.ok)throw new Error(`Could not check branch page: ${pageId}`);
 const doc=new DOMParser().parseFromString(await response.text(),'text/html');
 const customScript=[...doc.querySelectorAll('script')].some(script=>script.src ? !/\/(loading|piece-page)\.js$/.test(script.getAttribute('src')) : script.textContent.trim());
 return Boolean(customScript || doc.querySelector('style, main img, main canvas, main video, main iframe') || doc.querySelector('article')?.textContent.trim() || doc.querySelector('#pieceSources')?.textContent.trim());
}
async function start() {
  const response = await fetch('./pieces/pieces.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load the piece notebook. Reload to retry.');
  const records=await response.json();
  const pageId=piece=>piece.pageId??piece.repositoryId??piece.id;
  const progress=new Map(await Promise.all([...new Set(records.map(pageId))].map(async id=>[id,await hasBranchWork(id)])));
  for (const piece of records) {
    if (definitionsOnly && (piece.pageId !== 'vapes' || piece.id === 'vapes')) continue;
    const card = document.createElement('details');
    card.open = definitionsOnly;
    const summary = document.createElement('summary'); const nameText = document.createTextNode(piece.name); summary.append(nameText);
    const badge = document.createElement('span'); badge.className = 'summaryStatus'; summary.append(badge);
    const documentBody = document.createElement('div'); documentBody.className = 'document';
    const row = document.createElement('div'); row.className = 'row'; documentBody.append(row);
    const values = Object.fromEntries(fields.map(([key]) => [key, key === 'branchComplete' ? progress.get(pageId(piece)) : piece[key] || (key === 'status' ? 'Not started' : '')]));
    const message = document.createElement('span'); message.className = 'saveState'; message.setAttribute('role', 'status');
    const state = { pageId: pageId(piece), id: piece.id, name: piece.name, card, badge, values, base: { ...values }, message };
    states.push(state);
    for (const [key, title, type, help] of fields) {
      const label = document.createElement('label'); label.textContent = title;
      if (help) { const note = document.createElement('span'); note.className = 'help'; note.textContent = help; label.append(note); }
      const input = document.createElement(['date', 'text', 'checkbox'].includes(type) ? 'input' : type);
      if (['date','text','checkbox'].includes(type)) input.type = type;
      if (key === 'name') { input.required = true; input.maxLength = 200; input.pattern = '.*\\S.*'; }
      if (type === 'select') for (const value of ['Not started', 'Draft', 'Ready']) { const option = document.createElement('option'); option.textContent = value; input.append(option); }
      if(key==='branchComplete')input.disabled=true;
      input.name = key; if(type==='checkbox') input.checked=values[key]; else input.value = values[key];
      if (type === 'textarea') input.maxLength = 100000;
      input.addEventListener('input', () => {
        values[key] = type==='checkbox' ? input.checked : input.value;
        updateProgress();
        if (key === 'name') nameText.textContent = input.value;
        showState(state, 'Unsaved changes');
        clearTimeout(state.timer); state.timer = setTimeout(() => save(state), 650);
      });
      input.addEventListener('change', () => save(state));
      label.append(input); (type === 'date' || type === 'select' ? row : documentBody).append(label);
    }
    const footer = document.createElement('div'); footer.className = 'footer';
    const link = document.createElement('a'); link.href = `./pieces/${encodeURIComponent(piece.pageId ?? piece.repositoryId ?? piece.id)}/`; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open piece page ↗';
    const retry = document.createElement('button'); retry.textContent = 'Save now / retry'; retry.onclick = () => save(state);
    footer.append(link, retry, message); documentBody.append(footer);
    card.append(summary, documentBody); document.getElementById('pieces').append(card);
    showState(state, 'Saved');
  }
  filter();updateProgress();
}
document.getElementById('search').addEventListener('input', filter);
document.getElementById('filter').addEventListener('change', filter);
window.addEventListener('beforeunload', event => {
  if (states.some(state => state.saving || Object.keys(changed(state)).length)) { event.preventDefault(); event.returnValue = ''; }
});
start().catch(error => { const message = document.getElementById('error'); message.hidden = false; message.textContent = error.message; });
