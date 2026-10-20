// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { projects } from '../src/config.js';
import { localize, setLang, t } from '../src/i18n.js';
import { renderBoard } from '../src/ui/board.js';

const ready = {
  status: 'ready',
  title: { en: 'Moonlight Atlas', es: 'Atlas Lunar' },
  description: 'x',
  tags: ['React'],
  url: 'https://github.com/miguelfdz014/x',
};

let root;
beforeEach(() => {
  setLang('en');
  document.body.innerHTML = '<section id="projects"><div class="stage-ui" data-stage="board"></div></section>';
  root = document.querySelector('.stage-ui');
});

describe('quest board', () => {
  test('three incoming projects render three sealed parchments', () => {
    renderBoard(root, { projects, t, localize });
    const notes = root.querySelectorAll('.parchment');
    expect(notes).toHaveLength(3);
    for (const n of notes) {
      expect(n.getAttribute('aria-disabled')).toBe('true');
      expect(n.textContent).toBe(t('board.sealed'));
    }
  });

  test('ready project opens a dialog and Escape closes it', () => {
    renderBoard(root, { projects: [ready], t, localize });
    const note = root.querySelector('.parchment');
    note.click();
    const dialog = root.querySelector('dialog.quest');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Moonlight Atlas');
    const link = dialog.querySelector('a');
    expect(link.getAttribute('href')).toBe(ready.url);
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('dialog.quest')).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('.parchment'));
  });

  test('language switch keeps the panel open', () => {
    const ui = renderBoard(root, { projects: [ready], t, localize });
    root.querySelector('.parchment').click();
    setLang('es');
    renderBoard(root, { projects: [ready], t, localize, openId: ui.openId });
    const dialog = root.querySelector('dialog.quest');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Atlas Lunar');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  test('an open quest closes when its board leaves the screen', () => {
    renderBoard(root, { projects: [ready], t, localize });
    root.querySelector('.parchment').click();
    root.dispatchEvent(new Event('stage:hidden'));
    expect(root.querySelector('dialog.quest')).toBeNull();
  });

  test('six projects paginate', () => {
    renderBoard(root, { projects: Array.from({ length: 6 }, () => ({ status: 'incoming' })), t, localize });
    expect(root.querySelectorAll('.parchment')).toHaveLength(5);
    root.querySelector('.board__next').click();
    expect(root.querySelectorAll('.parchment')).toHaveLength(1);
  });
});
