import { packData, unpackData, cardsToPackObject, packObjectToCards } from './pack.js';

export const COLUMNS = {
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
  DISCARDED: 'discarded',
  ARCHIVED: 'archived',
};

export const BOARD_COLUMNS = [
  COLUMNS.TODO,
  COLUMNS.DOING,
  COLUMNS.DONE,
  COLUMNS.DISCARDED,
];

export const ALL_COLUMNS = [...BOARD_COLUMNS, COLUMNS.ARCHIVED];

export const COLUMN_LABELS = {
  [COLUMNS.TODO]: 'Todo',
  [COLUMNS.DOING]: 'Doing',
  [COLUMNS.DONE]: 'Done',
  [COLUMNS.DISCARDED]: 'Discarded',
  [COLUMNS.ARCHIVED]: 'Archived',
};

const DELIMITER = '\x1e';
const ESCAPED_PIPE = '\\|';

function decodeCardFields(value) {
  const parts = value.split(DELIMITER);
  const unescape = (s) => (s || '').replace(/\\\|/g, '|');
  return {
    title: unescape(parts[0] || ''),
    description: unescape(parts[1] || ''),
    dueDate: parts[2] || null,
  };
}

/** Legacy column[]= format — kept for backward compatibility */
export function parseLegacyUrlParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const cards = [];

  for (const column of ALL_COLUMNS) {
    const key = `${column}[]`;
    for (const value of params.getAll(key)) {
      const decoded = decodeCardFields(decodeURIComponent(value));
      if (!decoded.title.trim()) continue;
      cards.push({
        title: decoded.title.trim(),
        description: decoded.description.trim(),
        dueDate: decoded.dueDate || null,
        column,
      });
    }
  }

  return cards;
}

export async function parseUrlParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const packed = params.get('b');

  if (packed) {
    const data = await unpackData(packed);
    return packObjectToCards(data, ALL_COLUMNS);
  }

  return parseLegacyUrlParams(search);
}

export async function buildShareUrl(cards, baseUrl = window.location.href.split('?')[0]) {
  const data = cardsToPackObject(cards, ALL_COLUMNS);
  const packed = await packData(data);
  return `${baseUrl}?b=${packed}`;
}

export function stripUrlParams() {
  const clean = window.location.href.split('?')[0];
  window.history.replaceState({}, '', clean);
}

export function hasUrlParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  return params.has('b') || ALL_COLUMNS.some((col) => params.has(`${col}[]`));
}
