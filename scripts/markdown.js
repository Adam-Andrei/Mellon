import { ALL_COLUMNS } from './url.js';

const COLUMN_MAP = {
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
  DISCARDED: 'discarded',
  ARCHIVED: 'archived',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BULLET_RE = /^([+\-*])\s+(.*)$/;
const HEADER_RE = /^#\s+(\S+)\s*$/;

function isNestedLine(line) {
  return /^\t/.test(line) || /^ {2,}\S/.test(line);
}

function parseBulletContent(line) {
  const trimmed = line.trimStart();
  const match = trimmed.match(BULLET_RE);
  if (!match) return null;
  return match[2].trim();
}

export function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const cards = [];
  const errors = [];

  let currentColumn = null;
  let currentCard = null;

  function flushCard() {
    if (currentCard && currentCard.title.trim()) {
      cards.push({ ...currentCard, column: currentColumn });
    }
    currentCard = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.trim() === '') continue;

    const headerMatch = line.match(HEADER_RE);
    if (headerMatch) {
      flushCard();
      const key = headerMatch[1].toUpperCase();
      if (!COLUMN_MAP[key]) {
        errors.push(`Line ${lineNum}: unknown column "${headerMatch[1]}"`);
        currentColumn = null;
        continue;
      }
      currentColumn = COLUMN_MAP[key];
      continue;
    }

    if (!currentColumn) {
      errors.push(`Line ${lineNum}: expected a column header (# TODO, # DOING, etc.)`);
      continue;
    }

    const content = parseBulletContent(isNestedLine(line) ? line.replace(/^(\t|\s{2,})/, '') : line);
    if (content === null) {
      errors.push(`Line ${lineNum}: invalid format — use +, -, or * for items`);
      continue;
    }

    if (!isNestedLine(line)) {
      flushCard();
      currentCard = { title: content, description: '', dueDate: null };
      continue;
    }

    if (!currentCard) {
      errors.push(`Line ${lineNum}: indented item must follow a title`);
      continue;
    }

    if (DATE_RE.test(content)) {
      if (currentCard.dueDate) {
        errors.push(`Line ${lineNum}: card already has a due date`);
        continue;
      }
      currentCard.dueDate = content;
    } else {
      if (currentCard.description) {
        errors.push(`Line ${lineNum}: card already has a description`);
        continue;
      }
      currentCard.description = content;
    }
  }

  flushCard();

  if (errors.length > 0) {
    const err = new Error(errors.join('\n'));
    err.details = errors;
    throw err;
  }

  return cards;
}

export function cardsToMarkdown(cards) {
  const byColumn = {};
  for (const col of ALL_COLUMNS) byColumn[col] = [];
  for (const card of cards) {
    if (byColumn[card.column]) byColumn[card.column].push(card);
  }

  const sections = [];
  for (const col of ALL_COLUMNS) {
    const colCards = byColumn[col];
    if (colCards.length === 0) continue;
    sections.push(`# ${col.toUpperCase()}`);
    for (const card of colCards) {
      sections.push(`+ ${card.title}`);
      if (card.description) sections.push(`\t+ ${card.description}`);
      if (card.dueDate) sections.push(`\t* ${card.dueDate}`);
    }
    sections.push('');
  }
  return sections.join('\n').trim();
}

export const MARKDOWN_PLACEHOLDER = `# TODO
+ Title
\t+ Description
\t* YYYY-MM-DD
# DOING
* Title
\t* Description
\t* YYYY-MM-DD`;
