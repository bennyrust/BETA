// Classic script loaded before page modules; independent of Three.js and its CDN.
(() => {
  const script = document.currentScript;
  const api = new URL('../api/loading-text', script.src);
  const root = document.documentElement;
  const overlay = document.createElement('div');
  overlay.id = 'siteLoading';
  overlay.innerHTML = `<section class="load-window" role="dialog" aria-modal="true" aria-label="Loading page"><div class="load-title">3D ROOM — Please wait...</div><div class="load-content"><p class="load-status" role="status">Connecting...</p><div class="load-track" role="progressbar" aria-label="Loading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="load-fill"></div></div><p class="load-count">0%</p><blockquote class="load-quote">Please wait while the page loads.</blockquote><a class="load-source" hidden target="_blank" rel="noopener noreferrer"></a><div class="load-actions"><button type="button" hidden>Retry</button></div></div></section>`;
  document.body.append(overlay);
  const status = overlay.querySelector('.load-status');
  const bar = overlay.querySelector('[role="progressbar"]');
  const fill = overlay.querySelector('.load-fill');
  const count = overlay.querySelector('.load-count');
  const quote = overlay.querySelector('.load-quote');
  const source = overlay.querySelector('.load-source');
  const retry = overlay.querySelector('button');
  let timer, excerpts = [], finished = false;
  function update(value, message) {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    bar.setAttribute('aria-valuenow', percent);
    fill.style.width = `${percent}%`;
    count.textContent = `${percent}%`;
    status.textContent = message;
  }
  function rotate() {
    if (!excerpts.length) return;
    const item = excerpts[Math.floor(Math.random() * excerpts.length)];
    quote.textContent = `>${item.text}`;
    source.textContent = `4chan /pol/ · No.${item.no}`;
    source.href = item.url;
    source.hidden = false;
  }
  async function getQuotes() {
    try {
      const response = await fetch(api, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('Feed unavailable');
      const data = await response.json();
      excerpts = data.filter(item => typeof item.text === 'string' && /^https:\/\/boards\.4chan\.org\/pol\/thread\/\d+#p\d+$/.test(item.url));
      if (!excerpts.length) throw new Error('No posts available');
      if (!finished) { rotate(); clearInterval(timer); timer = setInterval(rotate, 4500); }
    } catch {
      if (!finished) quote.textContent = 'Please wait... (post feed unavailable)';
    }
  }
  function show() {
    finished = false;
    root.setAttribute('data-site-loading', '');
    overlay.hidden = false;
    retry.hidden = true;
    update(0, 'Loading page...');
    if (excerpts.length) { rotate(); clearInterval(timer); timer = setInterval(rotate, 4500); }
    else getQuotes();
  }
  function finish() {
    finished = true;
    clearInterval(timer);
    root.removeAttribute('data-site-loading');
    overlay.hidden = true;
  }
  function fail(message) {
    status.textContent = message;
    retry.hidden = false;
    clearInterval(timer);
  }
  retry.addEventListener('click', () => location.reload());
  window.siteLoading = { update, finish, fail, show };
  show();
  if (root.dataset.loadingMode === 'page') window.addEventListener('load', finish, { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) finish(); });
  window.addEventListener('pagehide', () => clearInterval(timer));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.download || (link.target && link.target !== '_self')) return;
    const target = new URL(link.href);
    if (target.origin !== location.origin || (target.pathname === location.pathname && target.search === location.search)) return;
    // Let native navigation (and unsaved-change prompts) retain their normal behavior.
    show();
    setTimeout(() => { if (!finished) finish(); }, 8000);
  });
})();
