import {
  getState,
  setState,
  clearState,
  addCard,
  moveCard,
  deleteCard,
  archiveCard,
  discardCard,
  restoreCard,
  mergeUrlCards,
  getCardsByColumn,
  getCustomColumns,
  setCustomColumns,
  addCustomColumn,
} from './state.js';
import { BOARD_COLUMNS, parseUrlParams, buildShareUrl, stripUrlParams, hasUrlParams } from './url.js';
import { createForm } from './components/form/index.js';
import { createCard, setupDropZone } from './components/card/index.js';
import { renderQR } from './components/qrcode/index.js';
import { createMarkdownDock } from './components/markdown/index.js';

let cards = [];
let activeTab = 'board';

const boardTab = document.getElementById('board-tab');
const archiveTab = document.getElementById('archive-tab');
const tabButtons = document.querySelectorAll('.tab');
const sharePanel = document.getElementById('share-panel');
const shareUrlInput = document.getElementById('share-url');
const qrContainer = document.getElementById('qr-container');

function saveAndRender() {
  setState(cards);
  render();
}

function handleAddCard(data) {
  cards = addCard(cards, data);
  saveAndRender();
}

function handleImportMarkdown(parsedCards) {
  // Normalize imported card columns: prefer preset columns, then existing custom columns
  const presetMap = {
    todo: 'todo',
    doing: 'doing',
    done: 'done',
    discarded: 'discarded',
    archived: 'archived',
  };

  const customs = getCustomColumns() || [];
  const customLabelMap = {};
  for (const c of customs) {
    if (!c || !c.label) continue;
    customLabelMap[String(c.label).trim().toLowerCase()] = c.id;
  }

  const normalized = parsedCards.map((pc) => {
    if (!pc || !pc.column) return pc;
    const col = String(pc.column).trim();
    const lower = col.toLowerCase();
    // If matches preset label names or keys, map to preset id
    if (presetMap[lower]) return { ...pc, column: presetMap[lower] };
    // If matches custom label, map to that custom id
    if (customLabelMap[lower]) return { ...pc, column: customLabelMap[lower] };
    // Also check uppercase preset labels (e.g., header text "TODO") by comparing against known labels
    // If not matched, return as-is (will create a new custom column if you choose to)
    return pc;
  });

  cards = mergeUrlCards(cards, normalized);
  saveAndRender();
}

function handleMove(cardId, column) {
  const card = cards.find((c) => c.id === cardId);
  if (!card || card.column === column) return;
  if (column === 'archived') return;
  cards = moveCard(cards, cardId, column);
  saveAndRender();
}

function handleArchive(cardId) {
  cards = archiveCard(cards, cardId);
  saveAndRender();
}

function handleDiscard(cardId) {
  cards = discardCard(cards, cardId);
  saveAndRender();
}

function handleRestore(cardId) {
  cards = restoreCard(cards, cardId);
  saveAndRender();
}

function handleDelete(cardId) {
  if (!confirm('Delete this card permanently?')) return;
  cards = deleteCard(cards, cardId);
  saveAndRender();
}

function cardHandlers(context) {
  return {
    context,
    onArchive: handleArchive,
    onDiscard: handleDiscard,
    onRestore: handleRestore,
    onDelete: handleDelete,
  };
}

function renderColumn(column, context = 'board') {
  const cardsContainer = document.querySelector(`[data-cards="${column}"]`);
  if (!cardsContainer) return;

  cardsContainer.innerHTML = '';
  const columnCards = getCardsByColumn(cards, column);

  for (const card of columnCards) {
    cardsContainer.appendChild(createCard(card, cardHandlers(context)));
  }
}

function initDropZones() {
  for (const column of getColumns()) {
    const cardsContainer = document.querySelector(`[data-cards="${column}"]`);
    if (cardsContainer) {
      setupDropZone(cardsContainer, column, handleMove);
    }
  }
}

function renderForms() {
  for (const column of getColumns()) {
    const formContainer = document.querySelector(`[data-form="${column}"]`);
    if (!formContainer) continue;
    formContainer.innerHTML = '';
    formContainer.appendChild(
      createForm({
        onSubmit: handleAddCard,
        defaultColumn: column,
        showColumnSelect: false,
      })
    );
  }
}

function render() {
  for (const column of getColumns()) {
    renderColumn(column, 'board');
  }
  renderColumn('archived', 'archive');
}

function getColumns() {
  const customs = getCustomColumns() || [];
  const customIds = customs.map((c) => c.id);
  return [...BOARD_COLUMNS, ...customIds];
}

function addColumnToDOM(col) {
  if (!col || !col.id) return;
  const existing = document.querySelector(`[data-column="${col.id}"]`);
  if (existing) return;
  const board = document.getElementById('board-tab');
  const el = document.createElement('div');
  el.className = 'column';
  el.setAttribute('data-column', col.id);
  el.innerHTML = `
    <h2 class="column__title">${col.label}</h2>
    <div class="column__form" data-form="${col.id}"></div>
    <div class="column__cards" data-cards="${col.id}"></div>
  `;
  board.appendChild(el);
}

function ensureCustomColumnsInDOM() {
  const customs = getCustomColumns() || [];
  for (const c of customs) addColumnToDOM(c);
}

function initCustomTab() {
  const addBtn = document.getElementById('add-col-btn');
  const pop = document.getElementById('add-column-popover');
  const input = document.getElementById('new-col-name');
  const createBtn = document.getElementById('create-col-btn');
  const cancelBtn = document.getElementById('cancel-col-btn');

  if (!addBtn || !pop || !input || !createBtn || !cancelBtn) return;

  function open() {
    pop.hidden = false;
    input.value = '';
    setTimeout(() => input.focus(), 0);
  }

  function close() {
    pop.hidden = true;
    input.value = '';
  }

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    open();
  });

  cancelBtn.addEventListener('click', close);

  createBtn.addEventListener('click', () => {
    const name = (input.value || '').trim();
    if (!name) return alert('Enter a column name');
    const existing = getColumns();
    // check id collision
    const slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `custom_${slug || Date.now().toString(36)}`;
    if (existing.includes(id)) return alert('A column with a similar name already exists');
    const entry = addCustomColumn(name);
    addColumnToDOM(entry);
    renderForms();
    initDropZones();
    render();
    close();
  });

  // close when clicking outside
  document.addEventListener('click', (ev) => {
    if (pop.hidden) return;
    if (!pop.contains(ev.target) && ev.target !== addBtn) close();
  });
}

function switchTab(tab) {
  activeTab = tab;
  tabButtons.forEach((btn) => {
    btn.classList.toggle('tab--active', btn.dataset.tab === tab);
  });
  boardTab.hidden = tab !== 'board';
  archiveTab.hidden = tab !== 'archive';
}

function initTabs() {
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function initClear() {
  document.getElementById('clear-btn').addEventListener('click', () => {
    const confirmed = confirm(
      'Warning: This will permanently wipe out everything on all lists (Todo, Doing, Done, Discarded, Archived, and any custom columns).\n\nThis cannot be undone. Continue?'
    );
    if (!confirmed) return;

    cards = [];
    clearState();

    const board = document.getElementById('board-tab');
    if (board) {
      board.querySelectorAll('.column[data-column^="custom_"]').forEach((col) => col.remove());
    }

    render();
    switchTab('board');
  });
}

function initShare() {
  document.getElementById('share-btn').addEventListener('click', async () => {
    const url = await buildShareUrl(cards);
    shareUrlInput.value = url;
    sharePanel.hidden = false;
    await renderQR(qrContainer, url);
  });

  document.getElementById('close-share-btn').addEventListener('click', () => {
    sharePanel.hidden = true;
  });

  document.getElementById('copy-btn').addEventListener('click', async () => {
    shareUrlInput.select();
    try {
      await navigator.clipboard.writeText(shareUrlInput.value);
      const btn = document.getElementById('copy-btn');
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    } catch {
      document.execCommand('copy');
    }
  });
}

function initMarkdownDock() {
  const root = document.getElementById('md-dock-root');
  const dock = createMarkdownDock({ onImport: handleImportMarkdown });
  root.appendChild(dock);

  // Close handler from dock — hide the entire root
  dock.addEventListener('md-close', () => {
    root.hidden = true;
    const toggle = document.getElementById('md-toggle-btn');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });

  // Global toggle button to show/hide the dock
  const mdToggle = document.getElementById('md-toggle-btn');
  if (mdToggle) {
    mdToggle.addEventListener('click', () => {
      const nowHidden = root.hidden;
      root.hidden = !nowHidden;
      mdToggle.setAttribute('aria-expanded', String(!nowHidden));
      if (!nowHidden) return;
      // focus textarea when opening
      const ta = root.querySelector('.md-dock__textarea');
      if (ta) ta.focus();
    });
  }
}

async function initFromUrl() {
  if (!hasUrlParams()) return;

  try {
    const urlCards = await parseUrlParams();
    if (urlCards.length > 0) {
      cards = mergeUrlCards(cards, urlCards);
      setState(cards);
    }
  } catch (err) {
    console.error('Invalid URL data', err);
    alert('Could not load board data from URL.');
  } finally {
    stripUrlParams();
  }
}

async function init() {
  cards = getState();
  await initFromUrl();
  ensureCustomColumnsInDOM();
  renderForms();
  initDropZones();
  render();
  initTabs();
  initClear();
  initShare();
  initMarkdownDock();
  initCustomTab();
}

init();
