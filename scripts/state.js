const STORAGE_KEY = 'melon-board';

export function generateId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setState(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  clearCustomColumns();
}

export function createCard({ title, description, dueDate, column }) {
  return {
    id: generateId(),
    title,
    description: description || '',
    dueDate: dueDate || null,
    column,
    createdAt: Date.now(),
  };
}

export function addCard(cards, data) {
  const card = createCard(data);
  return [...cards, card];
}

export function moveCard(cards, id, column) {
  return cards.map((c) => (c.id === id ? { ...c, column } : c));
}

export function updateCard(cards, id, updates) {
  return cards.map((c) => (c.id === id ? { ...c, ...updates } : c));
}

export function deleteCard(cards, id) {
  return cards.filter((c) => c.id !== id);
}

export function archiveCard(cards, id) {
  return moveCard(cards, id, 'archived');
}

export function discardCard(cards, id) {
  return moveCard(cards, id, 'discarded');
}

export function restoreCard(cards, id) {
  return moveCard(cards, id, 'todo');
}

export function mergeUrlCards(cards, urlCards) {
  const merged = [...cards];
  for (const data of urlCards) {
    merged.push(createCard(data));
  }
  return merged;
}

export function getCardsByColumn(cards, column) {
  return cards
    .filter((c) => c.column === column)
    .sort((a, b) => a.createdAt - b.createdAt);
}

// Custom columns persistence (stored as array of { id, label })
const COLUMNS_KEY = 'melon-columns';

export function getCustomColumns() {
  try {
    const raw = localStorage.getItem(COLUMNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function setCustomColumns(cols) {
  try {
    localStorage.setItem(COLUMNS_KEY, JSON.stringify(cols));
  } catch {}
}

export function addCustomColumn(label) {
  const cols = getCustomColumns();
  const slug = String(label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `custom_${slug || Date.now().toString(36)}`;
  const entry = { id, label: String(label).trim() };
  cols.push(entry);
  setCustomColumns(cols);
  return entry;
}

export function clearCustomColumns() {
  localStorage.removeItem(COLUMNS_KEY);
}

export function deleteCustomColumn(id) {
  const cols = (getCustomColumns() || []).filter((col) => col && col.id !== id);
  if (cols.length === 0) {
    localStorage.removeItem(COLUMNS_KEY);
    return [];
  }
  setCustomColumns(cols);
  return cols;
}
