// The About chronicle laid over the library painting: the intro and stack on the book's pages, one scroll per
// certification on the shelf, and the hobby objects as labelled spots. All of it is real, focusable HTML.
import hotspots from '../art/hotspots.json';

const H = hotspots.library;
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

export function renderAbout(root, { certifications, t, localize }) {
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
  book.addEventListener('click', () => {
    const open = book.getAttribute('aria-expanded') !== 'true';
    book.setAttribute('aria-expanded', String(open));
    notes.hidden = !open;
  });

  const shelf = el('ul', { class: 'scrolls', 'data-art': spot(H.scrollShelf), 'aria-label': t('about.scrolls') });
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
