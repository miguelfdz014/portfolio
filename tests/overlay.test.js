// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mountOverlay } from '../src/ui/overlay.js';

let section, ui, button;
beforeEach(() => {
  document.body.innerHTML = '<section id="about"><div class="stage-ui"><button data-art="0,0.5,0.5">Scroll</button></div></section>';
  section = document.getElementById('about');
  ui = section.querySelector('.stage-ui');
  button = ui.querySelector('button');
});

describe('overlay', () => {
  test('focus on a hidden hotspot glides to its section', () => {
    const glideTo = vi.fn();
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 2, h: 1 }), glideTo);
    overlay.setActive(false);
    button.focus();
    expect(glideTo).toHaveBeenCalledWith(section);
  });

  test('inactive hotspots stay focusable', () => {
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 2, h: 1 }), vi.fn());
    overlay.setActive(false);
    expect(button.classList.contains('is-hidden')).toBe(true);
    expect(button.hasAttribute('inert')).toBe(false);
    expect(button.getAttribute('tabindex')).not.toBe('-1');
  });

  test('art failure leaves content usable', () => {
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 0, h: 0 }), vi.fn());
    expect(() => overlay.place(3.556, { width: 1600, height: 900 })).not.toThrow();
    expect(button.textContent).toBe('Scroll');
  });

  test('exposes the art width in pixels for sizing text to the painting', () => {
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 3.556, h: 2 }), vi.fn());
    overlay.place(3.556, { width: 1600, height: 900 });
    expect(ui.style.getPropertyValue('--art-w')).toBe('1600px');
  });

  test('before its art is laid out, a hotspot still gets its own spot', () => {
    // Unplaced hotspots would all pile up in one corner and overlap each other.
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 0, h: 0 }), vi.fn());
    overlay.place(3.556, { width: 1600, height: 900 });
    expect(button.style.left).toBe('800px');
    expect(button.style.top).toBe('450px');
  });

  test('refresh re-applies placement and hiding to re-rendered controls', () => {
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 2, h: 1 }), vi.fn());
    overlay.place(3.556, { width: 1600, height: 900 });
    overlay.setActive(false);
    ui.innerHTML = '<button data-art="0,0.5,0.5">New</button>';
    overlay.refresh();
    const fresh = ui.querySelector('button');
    expect(fresh.classList.contains('is-hidden')).toBe(true);
    expect(fresh.style.left).toBe('800px');
  });

  test('hiding the overlay tells its controls the stage is gone', () => {
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 2, h: 1 }), vi.fn());
    const seen = vi.fn();
    ui.addEventListener('stage:hidden', seen);
    overlay.setActive(false);
    overlay.setActive(false);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  test('in the flow layout, focus does not glide (the browser already scrolled to it)', () => {
    document.documentElement.classList.add('stage-flow');
    const glideTo = vi.fn();
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 2, h: 1 }), glideTo);
    overlay.setActive(false);
    button.focus();
    document.documentElement.classList.remove('stage-flow');
    expect(glideTo).not.toHaveBeenCalled();
  });

  test('places a hotspot over its art point', () => {
    const overlay = mountOverlay(ui, 'library', () => ({ x: 0, y: 0, w: 2, h: 1 }), vi.fn());
    overlay.place(3.556, { width: 1600, height: 900 });
    expect(button.style.left).toBe('800px');
    expect(button.style.top).toBe('450px');
  });
});
