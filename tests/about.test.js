// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { certifications } from '../src/config.js';
import { localize, setLang, t } from '../src/i18n.js';
import { shouldPlayVideo } from '../src/scene/stages/library.js';
import { renderAbout } from '../src/ui/about.js';

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

  test('video never plays with reduced motion', () => {
    expect(shouldPlayVideo({ stage: 'library', motionOn: true, reducedMotion: true })).toBe(false);
    expect(shouldPlayVideo({ stage: 'library', motionOn: false, reducedMotion: false })).toBe(false);
    expect(shouldPlayVideo({ stage: 'library', motionOn: true, reducedMotion: false })).toBe(true);
    expect(shouldPlayVideo({ stage: 'board', motionOn: true, reducedMotion: false })).toBe(false);
  });
});
