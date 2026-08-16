import { parseMarkdown, MARKDOWN_PLACEHOLDER } from '../../markdown.js';

export function createMarkdownDock({ onImport }) {
  const dock = document.createElement('div');
  dock.className = 'md-dock';
  dock.id = 'md-dock';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'md-dock__toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `
    <span class="md-dock__icon" aria-hidden="true">+</span>
    <span class="md-dock__label">Paste Markdown…</span>
  `;

  const panel = document.createElement('div');
  panel.className = 'md-dock__panel';
  panel.hidden = true;

  const textarea = document.createElement('textarea');
  textarea.className = 'md-dock__textarea';
  textarea.placeholder = MARKDOWN_PLACEHOLDER;
  textarea.spellcheck = false;
  textarea.rows = 8;

  const errorEl = document.createElement('p');
  errorEl.className = 'md-dock__error';
  errorEl.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'md-dock__actions';

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'btn btn--small md-dock__import';
  importBtn.textContent = 'Import';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn--ghost btn--small';
  closeBtn.textContent = 'Close';

  actions.append(importBtn, closeBtn);
  panel.append(textarea, errorEl, actions);
  dock.append(toggle, panel);

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function open() {
    panel.hidden = false;
    toggle.hidden = true;
    toggle.setAttribute('aria-expanded', 'true');
    showError('');
    textarea.focus();
  }

  function close() {
    panel.hidden = true;
    toggle.hidden = false;
    toggle.setAttribute('aria-expanded', 'false');
    showError('');
  }

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', close);

  importBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) {
      showError('Paste Markdown before importing.');
      return;
    }
    try {
      const parsed = parseMarkdown(text);
      if (parsed.length === 0) {
        showError('No cards found. Check your format.');
        return;
      }
      onImport(parsed);
      textarea.value = '';
      showError('');
      close();
    } catch (err) {
      showError(err.message);
    }
  });

  return dock;
}
