// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { site } from '../src/config.js';
import { setLang, t } from '../src/i18n.js';
import { renderContact } from '../src/ui/contact.js';

let root, raven;
beforeEach(() => {
  setLang('en');
  document.body.innerHTML = '<section id="contact"><div class="stage-ui" data-stage="desk"></div></section>';
  root = document.querySelector('.stage-ui');
  raven = { perk: vi.fn(), launch: vi.fn() };
});

describe('contact', () => {
  test('links keep their real targets', () => {
    renderContact(root, { links: site.links, t, raven, reducedMotion: false });
    const ig = root.querySelector('a[data-link="instagram"]');
    const gh = root.querySelector('a[data-link="github"]');
    expect(ig.getAttribute('href')).toBe(site.links.instagram);
    expect(gh.getAttribute('href')).toBe(site.links.github);
    for (const a of [ig, gh]) {
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
      expect(a.getAttribute('target')).toBe('_blank');
    }
  });

  test('click does not block navigation', () => {
    renderContact(root, { links: site.links, t, raven, reducedMotion: false });
    const ig = root.querySelector('a[data-link="instagram"]');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    // jsdom would try to navigate; stop it only after our handlers ran.
    document.addEventListener('click', (e) => e.preventDefault(), { once: true });
    let blocked = null;
    ig.addEventListener('click', (e) => (blocked = e.defaultPrevented));
    ig.dispatchEvent(event);
    expect(blocked).toBe(false);
    expect(raven.launch).toHaveBeenCalledTimes(1);
  });

  test('reduced motion skips the flourish', () => {
    renderContact(root, { links: site.links, t, raven, reducedMotion: true });
    document.addEventListener('click', (e) => e.preventDefault(), { once: true });
    root.querySelector('a[data-link="github"]').click();
    expect(raven.launch).not.toHaveBeenCalled();
  });

  test('accessible name is the visible text plus a new-tab note', () => {
    renderContact(root, { links: site.links, t, raven, reducedMotion: false });
    for (const a of root.querySelectorAll('.letter a')) {
      expect(a.hasAttribute('aria-label')).toBe(false);
      expect(a.querySelector('.visually-hidden').textContent).toContain(t('contact.newTab'));
    }
  });

  test('hover and focus perk the raven', () => {
    renderContact(root, { links: site.links, t, raven, reducedMotion: false });
    const gh = root.querySelector('a[data-link="github"]');
    gh.dispatchEvent(new Event('focus'));
    expect(raven.perk).toHaveBeenLastCalledWith(true);
    gh.dispatchEvent(new Event('blur'));
    expect(raven.perk).toHaveBeenLastCalledWith(false);
  });
});
