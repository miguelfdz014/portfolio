// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { certifications } from '../src/config.js';
import { localize, setLang, t } from '../src/i18n.js';
import { shouldPlayVideo } from '../src/scene/stages/library.js';
import { renderAbout } from '../src/ui/about.js';
import { hotspotsFor } from '../src/scene/hotspots.js';

let root;
beforeEach(() => {
  setLang('en');
  document.body.innerHTML = '<section id="about"><div class="stage-ui" data-stage="library"></div></section>';
  root = document.querySelector('.stage-ui');
});

describe('About chronicle', () => {
  test('renders one scroll per certification with status', () => {
    renderAbout(root, { certifications, t, localize });
    const scrolls = root.querySelectorAll('.scroll');
    expect(scrolls).toHaveLength(7);
    expect(root.querySelectorAll('.scroll[data-status="progress"]')).toHaveLength(2);
    expect(root.querySelectorAll('.scroll[data-status="awaiting"]')).toHaveLength(5);
  });

  test('scroll accessible name', () => {
    renderAbout(root, { certifications, t, localize });
    expect(root.querySelector('.scroll').getAttribute('aria-label')).toBe('Responsive Web Design, freeCodeCamp: in progress');
  });

  test('re-render in Spanish keeps count and translates', () => {
    renderAbout(root, { certifications, t, localize });
    setLang('es');
    renderAbout(root, { certifications, t, localize });
    const first = root.querySelector('.scroll').getAttribute('aria-label');
    expect(root.querySelectorAll('.scroll')).toHaveLength(7);
    expect(first).toContain('Diseño web responsive');
    expect(first).toContain(t('cert.status.progress'));
    expect(t('cert.status.progress')).toBe('en curso');
  });

  test('the book opens and closes the stack notes', () => {
    renderAbout(root, { certifications, t, localize });
    const book = root.querySelector('.book');
    const notes = root.querySelector('.book__notes');
    expect(book.getAttribute('aria-expanded')).toBe('false');
    expect(notes.hidden).toBe(true);
    book.click();
    expect(book.getAttribute('aria-expanded')).toBe('true');
    expect(notes.hidden).toBe(false);
    expect(notes.textContent).toContain('Python, FastAPI');
    book.click();
    expect(notes.hidden).toBe(true);
  });

  test('Escape closes the stack notes and returns focus to the book', () => {
    renderAbout(root, { certifications, t, localize });
    const book = root.querySelector('.book');
    book.click();
    book.focus();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('.book__notes').hidden).toBe(true);
    expect(book.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(book);
  });

  test('a click outside the notes closes them; a click inside does not', () => {
    renderAbout(root, { certifications, t, localize });
    const notes = root.querySelector('.book__notes');
    root.querySelector('.book').click();
    notes.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(notes.hidden).toBe(false);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(notes.hidden).toBe(true);
  });

  test('the certification scrolls sit on the scroll rack', () => {
    renderAbout(root, { certifications, t, localize });
    const [u, v] = hotspotsFor('library', 'landscape').scrollRack;
    expect(root.querySelector('.scrolls').dataset.art).toBe(`0,${u},${v}`);
  });

  test('portrait uses the portrait painting coordinates', () => {
    renderAbout(root, { certifications, t, localize, orient: 'portrait' });
    const P = hotspotsFor('library', 'portrait');
    expect(root.querySelector('.scrolls').dataset.art).toBe(`0,${P.scrollRack[0]},${P.scrollRack[1]}`);
    expect(root.querySelector('.book').dataset.art).toBe(`0,${P.book[0]},${P.book[1]}`);
  });

  test('a language switch in portrait keeps portrait coordinates', () => {
    renderAbout(root, { certifications, t, localize, orient: 'portrait' });
    const before = root.querySelector('.scrolls').dataset.art;
    setLang('es');
    renderAbout(root, { certifications, t, localize, orient: 'portrait' });
    expect(root.querySelector('.scrolls').dataset.art).toBe(before);
    expect(root.querySelector('.book__notes dt').textContent).toBe(t('stack.frontend'));
  });

  test('video never plays with reduced motion', () => {
    expect(shouldPlayVideo({ stage: 'library', motionOn: true, reducedMotion: true })).toBe(false);
    expect(shouldPlayVideo({ stage: 'library', motionOn: false, reducedMotion: false })).toBe(false);
    expect(shouldPlayVideo({ stage: 'library', motionOn: true, reducedMotion: false })).toBe(true);
    expect(shouldPlayVideo({ stage: 'board', motionOn: true, reducedMotion: false })).toBe(false);
  });
});
