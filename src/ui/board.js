// The Projects quest board: one parchment per project pinned to the painted board. A sealed (incoming) parchment
// stays shut; a ready one unrolls into a dialog with its details. Five slots per board; more projects page on.
import hotspots from '../art/hotspots.json';

const SLOTS = hotspots.board.slots;
const PER_BOARD = SLOTS.length;

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

function escapeUrl(url) {
  return /^https?:\/\//.test(url ?? '') ? url : '#';
}

export function renderBoard(root, { projects, t, localize, openId = null }) {
  const ids = projects.map((_, i) => `quest-${i}`);
  let page = openId ? Math.floor(ids.indexOf(openId) / PER_BOARD) : 0;
  if (!(page >= 0)) page = 0;
  const state = { openId: null };

  function noteFor(id) {
    return root.querySelector(`.parchment[data-id="${id}"]`);
  }

  function close() {
    const id = state.openId;
    const dialog = root.querySelector('.quest');
    if (dialog?.open && typeof dialog.close === 'function') dialog.close();
    dialog?.remove();
    state.openId = null;
    noteFor(id)?.focus();
  }

  function open(id) {
    const p = projects[ids.indexOf(id)];
    if (!p || p.status !== 'ready') return;
    root.querySelector('.quest')?.remove();
    state.openId = id;
    // A native modal dialog: it traps focus and makes the page behind it inert.
    const dialog = el('dialog', { class: 'quest', 'aria-labelledby': 'quest-title' });
    const title = el('h3', { id: 'quest-title' }, localize(p.title));
    const body = el('p', {}, localize(p.description));
    const tags = (p.tags ?? []).length ? el('p', { class: 'quest__tags' }, p.tags.join(' · ')) : null;
    const link = el('a', { href: escapeUrl(p.url), target: '_blank', rel: 'noopener noreferrer' }, t('projects.view'));
    const closeBtn = el('button', { type: 'button', class: 'quest__close' }, t('board.close'));
    closeBtn.addEventListener('click', close);
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    });
    dialog.append(...[title, body, tags, link, closeBtn].filter(Boolean));
    root.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    closeBtn.focus();
  }

  function draw() {
    root.replaceChildren();
    const list = el('ul', { class: 'board', 'aria-label': t('projects.title') });
    projects.slice(page * PER_BOARD, page * PER_BOARD + PER_BOARD).forEach((p, k) => {
      const i = page * PER_BOARD + k;
      const [u, v] = SLOTS[k];
      const li = el('li', { 'data-art': `0,${u},${v}` });
      const ready = p.status === 'ready';
      const note = el('button', { type: 'button', class: 'parchment', 'data-id': ids[i], 'data-status': ready ? 'ready' : 'sealed' },
        ready ? localize(p.title) : t('board.sealed'));
      if (ready) note.addEventListener('click', () => open(ids[i]));
      else note.setAttribute('aria-disabled', 'true');
      li.append(note);
      list.append(li);
    });
    root.append(list);
    if (projects.length > PER_BOARD) {
      const next = el('button', { type: 'button', class: 'board__next', 'data-art': `0,${hotspots.board.face[2]},${hotspots.board.face[3]}` }, t('board.next'));
      next.addEventListener('click', () => {
        page = (page + 1) % Math.ceil(projects.length / PER_BOARD);
        draw();
      });
      root.append(next);
    }
  }

  draw();
  if (openId) open(openId);
  root.addEventListener('stage:hidden', () => state.openId && close());

  return {
    open,
    close,
    get openId() {
      return state.openId;
    },
  };
}
