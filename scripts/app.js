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
  cards = mergeUrlCards(cards, parsedCards);
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
  for (const column of BOARD_COLUMNS) {
    const cardsContainer = document.querySelector(`[data-cards="${column}"]`);
    if (cardsContainer) {
      setupDropZone(cardsContainer, column, handleMove);
    }
  }
}

function renderForms() {
  for (const column of BOARD_COLUMNS) {
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
  for (const column of BOARD_COLUMNS) {
    renderColumn(column, 'board');
  }
  renderColumn('archived', 'archive');
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
      'Warning: This will permanently wipe out everything on all lists (Todo, Doing, Done, Discarded, and Archived).\n\nThis cannot be undone. Continue?'
    );
    if (!confirmed) return;

    cards = [];
    clearState();
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
  root.appendChild(createMarkdownDock({ onImport: handleImportMarkdown }));
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
  renderForms();
  initDropZones();
  render();
  initTabs();
  initClear();
  initShare();
  initMarkdownDock();
}

init();
