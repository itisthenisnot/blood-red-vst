import { applyFilters } from './filters.js';
import { getFlags, toggleFlag, savedIds, exportJSON, importJSON } from './storage.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  tab: 'vst',
  items: [],          // all entries, both platforms
  categories: [],
  filters: { query: '', category: '', price: '', clap: false, obscure: false, sort: 'unique' },
};

const byId = new Map();

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) if (child != null) node.append(child);
  return node;
}

async function load() {
  const [vst, android, categories] = await Promise.all(
    ['data/vst.json', 'data/android.json', 'data/categories.json'].map((p) =>
      fetch(p).then((r) => {
        if (!r.ok) throw new Error(`${p}: ${r.status}`);
        return r.json();
      }),
    ),
  );
  state.categories = categories;
  state.items = [
    ...vst.map((i) => ({ ...i, platform: 'vst' })),
    ...android.map((i) => ({ ...i, platform: 'android', formats: [] })),
  ];
  for (const item of state.items) byId.set(item.id, item);
}

function itemsForTab() {
  if (state.tab === 'saved') {
    const ids = new Set(savedIds());
    return state.items.filter((i) => ids.has(i.id));
  }
  return state.items.filter((i) => i.platform === state.tab);
}

function catName(id) {
  return state.categories.find((c) => c.id === id)?.name ?? id;
}

function renderTabs() {
  for (const a of document.querySelectorAll('.tabs a')) {
    a.setAttribute('aria-selected', String(a.dataset.tab === state.tab));
  }
  const n = savedIds().filter((id) => byId.has(id)).length;
  $('#saved-count').textContent = n ? `(${n})` : '';
  $('#clap-wrap').hidden = state.tab === 'android';
}

function renderChips() {
  const present = new Set(itemsForTab().flatMap((i) => i.category));
  const chips = $('#chips');
  chips.replaceChildren();
  const make = (id, label) =>
    el('button', {
      type: 'button',
      'aria-pressed': String(state.filters.category === id),
      onclick: () => {
        state.filters.category = state.filters.category === id ? '' : id;
        render();
      },
    }, label);
  chips.append(make('', 'All'));
  for (const c of state.categories) if (present.has(c.id)) chips.append(make(c.id, c.name));
  if (state.filters.category && !present.has(state.filters.category)) state.filters.category = '';
  const cat = state.categories.find((c) => c.id === state.filters.category);
  $('#cat-blurb').textContent = cat ? cat.blurb : '';
}

function card(item) {
  const flags = getFlags(item.id);
  const marks = [flags.fav && '♥', flags.own && '✓', flags.want && '★'].filter(Boolean).join(' ');
  return el('button', { class: 'card', type: 'button', onclick: () => (location.hash = `#/item/${item.id}`) },
    el('div', { class: 'meta' },
      el('span', { class: 'drops', title: `Uniqueness ${item.uniqueness}/5`, 'aria-label': `Uniqueness ${item.uniqueness} of 5` },
        '●'.repeat(item.uniqueness) + '○'.repeat(5 - item.uniqueness)),
      marks ? el('span', { class: 'flags' }, marks) : null,
    ),
    el('h3', {}, item.name),
    el('p', { class: 'dev' }, item.developer),
    el('p', { class: 'desc' }, item.description),
    badges(item),
  );
}

function badges(item) {
  const wrap = el('div', { class: 'meta' });
  wrap.append(el('span', { class: `badge ${item.price === 'free' ? 'free' : ''}` }, item.price));
  for (const f of item.formats || []) wrap.append(el('span', { class: `badge ${f === 'CLAP' ? 'clap' : ''}` }, f));
  if (item.platform === 'android') wrap.append(el('span', { class: 'badge' }, 'Android'));
  for (const c of item.category) wrap.append(el('span', { class: 'badge' }, catName(c)));
  if (item.verified) wrap.append(el('span', { class: 'badge ok' }, 'checked'));
  return wrap;
}

function renderGrid() {
  const list = applyFilters(itemsForTab(), state.filters);
  const grid = $('#grid');
  grid.replaceChildren(...list.map(card));
  if (!list.length) {
    grid.append(el('p', { class: 'empty' },
      state.tab === 'saved' && !savedIds().length
        ? 'Nothing saved yet. Open any entry and tap ♥, ✓ or ★.'
        : 'No matches. Loosen a filter.'));
  }
  $('#result-count').textContent = `${list.length} ${list.length === 1 ? 'entry' : 'entries'}`;
  return list;
}

function render() {
  renderTabs();
  renderChips();
  return renderGrid();
}

function openDetail(id) {
  const item = byId.get(id);
  if (!item) return;
  $('#d-name').textContent = item.name;
  $('#d-dev').textContent = item.developer + (item.priceNote ? ` · ${item.priceNote}` : '');
  $('#d-meta').replaceChildren(...badges(item).childNodes);
  $('#d-desc').textContent = item.description;
  $('#d-why').textContent = item.whyUnique;
  $('#d-tips-h').textContent = item.platform === 'android' ? 'Getting it into Bitwig' : 'Bitwig 6 tips';
  $('#d-tips').textContent = item.bitwigTips;
  $('#d-tags').replaceChildren(...(item.tags || []).map((t) => el('span', { class: 'badge' }, `#${t}`)));
  $('#d-link').href = item.url;
  $('#d-note').textContent = item.verified
    ? 'Checked against an online source in Oct 2026.'
    : 'Not yet checked online. Confirm formats and price on the developer site.';
  syncDetailFlags(item.id);
  const dlg = $('#detail');
  dlg.dataset.id = item.id;
  if (!dlg.open) dlg.showModal();
}

function syncDetailFlags(id) {
  const flags = getFlags(id);
  for (const b of document.querySelectorAll('.d-actions [data-flag]')) {
    b.setAttribute('aria-pressed', String(!!flags[b.dataset.flag]));
  }
}

function route() {
  const hash = location.hash || '#/vst';
  const item = hash.match(/^#\/item\/(.+)$/);
  if (item) {
    const entry = byId.get(decodeURIComponent(item[1]));
    if (entry && state.tab !== 'saved' && state.tab !== entry.platform) {
      state.tab = entry.platform;
      render();
    }
    openDetail(decodeURIComponent(item[1]));
    return;
  }
  const tab = hash.slice(2);
  state.tab = ['vst', 'android', 'saved'].includes(tab) ? tab : 'vst';
  const dlg = $('#detail');
  if (dlg.open) dlg.close();
  render();
}

function wire() {
  $('#search').addEventListener('input', (e) => { state.filters.query = e.target.value.trim(); renderGrid(); });
  $('#price').addEventListener('change', (e) => { state.filters.price = e.target.value; renderGrid(); });
  $('#sort').addEventListener('change', (e) => { state.filters.sort = e.target.value; renderGrid(); });
  $('#clap').addEventListener('change', (e) => { state.filters.clap = e.target.checked; renderGrid(); });
  $('#obscure').addEventListener('change', (e) => { state.filters.obscure = e.target.checked; renderGrid(); });

  $('#surprise').addEventListener('click', () => {
    const list = applyFilters(itemsForTab(), state.filters);
    if (list.length) location.hash = `#/item/${list[Math.floor(Math.random() * list.length)].id}`;
  });

  const dlg = $('#detail');
  dlg.querySelector('.close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => {
    if (location.hash.startsWith('#/item/')) history.replaceState(null, '', `#/${state.tab}`);
    render();
  });
  for (const b of dlg.querySelectorAll('[data-flag]')) {
    b.addEventListener('click', () => {
      toggleFlag(dlg.dataset.id, b.dataset.flag);
      syncDetailFlags(dlg.dataset.id);
    });
  }

  $('#export').addEventListener('click', () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'blood-red-vst-saved.json' });
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      importJSON(await file.text());
      render();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
    e.target.value = '';
  });

  window.addEventListener('hashchange', route);
}

async function main() {
  wire();
  try {
    await load();
  } catch (err) {
    $('#grid').replaceChildren(el('p', { class: 'empty' }, `Couldn't load the catalog (${err.message}).`));
    return;
  }
  route();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
