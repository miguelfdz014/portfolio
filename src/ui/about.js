// The About chronicle laid over the library painting: the book opens a parchment with the stack, one scroll per
// certification on the scroll rack, and the hobby objects as labelled spots. All of it is real, focusable HTML.
import { hotspotsFor } from '../scene/hotspots.js';

const spot = ([u, v]) => `0,${u},${v}`;

const STACK = [
  ['stack.frontend', 'HTML, CSS, JavaScript, React'],
  ['stack.backend', 'Python, FastAPI'],
  ['stack.data', 'SQL, PostgreSQL'],
  ['stack.ai', 'Claude API (tool use)'],
  ['stack.tools', 'Git, GitHub'],
];

const HOBBIES = [
  ['dumbbell', 'about.hobby.lifting'],
  ['camera', 'about.hobby.camera'],
  ['photos', 'about.hobby.photos'],
  ['dragon', 'about.hobby.dragon'],
];

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

export function renderAbout(root, { certifications, t, localize, orient = 'landscape' }) {
  const H = hotspotsFor('library', orient);
  root.replaceChildren();

  // The book opens a parchment note with the stack (the pages themselves are crowded by the reader's arm).
  const book = el('button', {
    type: 'button',
    class: 'book',
    'data-art': spot(H.book),
    'aria-expanded': 'false',
    'aria-controls': 'book-notes',
    'data-tip': t('about.book'),
  });
  book.append(el('span', { class: 'visually-hidden' }, t('about.book')));
  const notes = el('div', { class: 'book__notes', id: 'book-notes', 'data-art': spot([H.book[0], H.book[1] - 0.2]) });
  notes.hidden = true;
  const stack = el('dl', { class: 'stack' });
  for (const [key, value] of STACK) {
    const row = el('div');
    row.append(el('dt', {}, t(key)), el('dd', {}, value));
    stack.append(row);
  }
  notes.append(stack);
  const setOpen = (open) => {
    book.setAttribute('aria-expanded', String(open));
    notes.hidden = !open;
  };
  book.addEventListener('click', () => setOpen(book.getAttribute('aria-expanded') !== 'true'));
  // The parchment covers the book, so Escape or a click anywhere else closes it. Listeners from an earlier render
  // (language or orientation change) are dropped.
  root._aboutAbort?.abort();
  const { signal } = (root._aboutAbort = new AbortController());
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || notes.hidden) return;
    setOpen(false);
    book.focus();
  }, { signal });
  document.addEventListener('click', (e) => {
    if (!notes.hidden && !notes.contains(e.target) && !book.contains(e.target)) setOpen(false);
  }, { signal });

  const shelf = el('ul', { class: 'scrolls', 'data-art': spot(H.scrollRack), 'aria-label': t('about.scrolls') });
  for (const c of certifications) {
    const label = t('cert.label', { name: localize(c.name), issuer: c.issuer, status: t(`cert.status.${c.status}`) });
    const li = el('li');
    li.append(el('button', { type: 'button', class: 'scroll', 'data-status': c.status, 'aria-label': label, 'data-tip': label }));
    shelf.append(li);
  }

  const hobbies = HOBBIES.map(([key, label]) =>
    el('button', { type: 'button', class: 'hobby', 'data-art': spot(H[key]), 'aria-label': t(label), 'data-tip': t(label) }),
  );

  root.append(book, notes, shelf, ...hobbies);
}
