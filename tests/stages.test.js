// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { renderBoard } from '../src/ui/board.js';
import { renderContact } from '../src/ui/contact.js';
import { projects, site } from '../src/config.js';
import { localize, setLang, t } from '../src/i18n.js';
import { hotspotsFor } from '../src/scene/hotspots.js';
import { boardDef } from '../src/scene/stages/board.js';
import { deskDef } from '../src/scene/stages/desk.js';
import { libraryDef } from '../src/scene/stages/library.js';

describe('integrated paintings', () => {
  test('board and desk have no cut-out character layers: one painting each (plus the raven sprite)', () => {
    const stills = (def) => def.layers.filter((L) => L.kind === 'paint' && !L.frames);
    expect(stills(boardDef)).toHaveLength(1);
    expect(stills(deskDef)).toHaveLength(1);
  });
  test('each base painting has a portrait version', () => {
    for (const def of [libraryDef, boardDef, deskDef]) expect(def.layers[0].src.portrait).toMatch(/-portrait-1280\.webp/);
  });
  test('the library loop has a portrait video', () => {
    expect(libraryDef.layers[0].video.portrait).toMatch(/loop-portrait\.mp4/);
  });
});

describe('portrait controls', () => {
  test('board slots come from the portrait painting', () => {
    setLang('en');
    document.body.innerHTML = '<div class="stage-ui"></div>';
    const root = document.querySelector('.stage-ui');
    renderBoard(root, { projects, t, localize, orient: 'portrait' });
    const [u, v] = hotspotsFor('board', 'portrait').slots[0];
    expect(root.querySelector('.board li').dataset.art).toBe(`0,${u},${v}`);
  });
  test('the letter sits on the portrait desk parchment', () => {
    document.body.innerHTML = '<div class="stage-ui"></div>';
    const root = document.querySelector('.stage-ui');
    renderContact(root, { links: site.links, t, raven: null, reducedMotion: false, orient: 'portrait' });
    const [u, v] = hotspotsFor('desk', 'portrait').parchment;
    expect(root.querySelector(".letter").dataset.art).toBe(`0,${u},${v}`);
  });
});

describe('raven', () => {
  test('sits on the sill of whichever painting is shown', async () => {
    const W = 1.0;
    const raven = deskDef.layers.find((L) => L.frames);
    const land = raven.layout(2 * 16 / 9, 0, 1, 'landscape');
    const port = raven.layout(W, 0, 1, 'portrait');
    const { deskRect } = await import('../src/scene/stages/desk.js');
    const R = deskRect(W, 'portrait');
    const [u] = hotspotsFor('desk', 'portrait').sill;
    expect(port.x).toBeCloseTo(R.x + (u - 0.5) * R.w, 5);
    expect(land.visible).not.toBe(false);
  });
});
