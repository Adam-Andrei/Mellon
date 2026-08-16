function isOverdue(dueDate) {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return due < today;
}

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function createActionBtn(label, className, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `card__action ${className}`;
  btn.textContent = label;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

export function createCard(card, { context = 'board', onArchive, onDiscard, onRestore, onDelete }) {
  const el = document.createElement('article');
  el.className = 'card';
  el.draggable = context === 'board';
  el.dataset.cardId = card.id;

  if (card.column === 'discarded') {
    el.classList.add('card--discarded');
  }

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = card.title;

  el.appendChild(title);

  if (card.description) {
    const desc = document.createElement('p');
    desc.className = 'card__desc';
    desc.textContent = String(card.description)
      .replace(/\\\r?\n/g, '\n')
      .replace(/\\\s*$/g, '')
      .replace(/\r\n/g, '\n');
    el.appendChild(desc);
  }

  if (card.dueDate) {
    const due = document.createElement('time');
    due.className = 'card__due';
    due.dateTime = card.dueDate;
    due.textContent = formatDueDate(card.dueDate);
    if (isOverdue(card.dueDate)) {
      due.classList.add('card__due--overdue');
    }
    el.appendChild(due);
  }

  const actions = document.createElement('div');
  actions.className = 'card__actions';

  if (context === 'board') {
    actions.append(
      createActionBtn('Archive', 'card__action--archive', () => onArchive(card.id)),
      createActionBtn('Discard', 'card__action--discard', () => onDiscard(card.id)),
      createActionBtn('Delete', 'card__action--delete', () => onDelete(card.id))
    );
  } else {
    actions.append(
      createActionBtn('Restore', 'card__action--restore', () => onRestore(card.id)),
      createActionBtn('Delete', 'card__action--delete', () => onDelete(card.id))
    );
  }

  el.appendChild(actions);

  if (context === 'board') {
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.id);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('card--dragging');
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('card--dragging');
    });
  }

  return el;
}

export function setupDropZone(container, column, onDrop) {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    container.classList.add('column__cards--drag-over');
  });

  container.addEventListener('dragleave', (e) => {
    if (!container.contains(e.relatedTarget)) {
      container.classList.remove('column__cards--drag-over');
    }
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    container.classList.remove('column__cards--drag-over');
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) onDrop(cardId, column);
  });
}
