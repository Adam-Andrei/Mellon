import { BOARD_COLUMNS, COLUMN_LABELS } from '../../url.js';

export function createForm({ onSubmit, defaultColumn = 'todo', showColumnSelect = true }) {
  const form = document.createElement('form');
  form.className = 'form';

  const titleInput = document.createElement('input');
  titleInput.className = 'form__input';
  titleInput.type = 'text';
  titleInput.placeholder = 'Title';
  titleInput.required = true;
  titleInput.maxLength = 200;

  const descInput = document.createElement('textarea');
  descInput.className = 'form__textarea';
  descInput.placeholder = 'Description (optional)';
  descInput.rows = 2;
  descInput.maxLength = 1000;

  const dueInput = document.createElement('input');
  dueInput.className = 'form__input';
  dueInput.type = 'date';

  let columnSelect = null;
  if (showColumnSelect) {
    columnSelect = document.createElement('select');
    columnSelect.className = 'form__select';
    for (const col of BOARD_COLUMNS) {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = COLUMN_LABELS[col];
      if (col === defaultColumn) opt.selected = true;
      columnSelect.appendChild(opt);
    }
  }

  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn--small';
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Add card';

  form.append(titleInput, descInput, dueInput);
  if (columnSelect) form.appendChild(columnSelect);
  form.appendChild(submitBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    onSubmit({
      title,
      description: descInput.value.trim(),
      dueDate: dueInput.value || null,
      column: columnSelect ? columnSelect.value : defaultColumn,
    });

    titleInput.value = '';
    descInput.value = '';
    dueInput.value = '';
    titleInput.focus();
  });

  return form;
}
