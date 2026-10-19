import './styles/main.css';
import './styles/scene.css';
import { site, projects } from './config.js';
import { initLang, setLang, getLang, onLangChange, t, localize } from './i18n.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Links & dates ----------
document.querySelectorAll('[data-link]').forEach((a) => {
  a.href = site.links[a.dataset.link];
});
const year = new Date().getFullYear();
document.getElementById('year').textContent = year;

function toRoman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
document.getElementById('roman-year').textContent = toRoman(year);

// ---------- Projects ----------
const grid = document.getElementById('projects-grid');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderProjects() {
  grid.innerHTML = projects
    .map((p, i) => {
      const delay = `style="--delay:${i * 120}ms"`;
      const num = escapeHtml(p.numeral ?? '');
      if (p.status !== 'ready') {
        return `
          <li class="card card--sealed reveal" ${delay}>
            <div class="card__top"><span>Nº ${num}</span><span class="card__badge">${escapeHtml(t('projects.sealed'))}</span></div>
            <div class="card__seal" aria-hidden="true">
              <svg viewBox="0 0 64 64"><use href="#icon-seal" /></svg>
              <svg class="card__seal-rose" viewBox="0 0 24 24"><use href="#icon-rose" /></svg>
            </div>
            <div class="card__bottom">
              <h3 class="card__title">${escapeHtml(t('projects.incoming'))}</h3>
              <p class="card__body">${escapeHtml(t('projects.incomingBody'))}</p>
            </div>
          </li>`;
      }
      const tags = (p.tags ?? []).map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');
      return `
        <li class="card reveal" ${delay}>
          <div class="card__top"><span>Nº ${num}</span></div>
          <div class="card__bottom" style="margin-top:auto">
            <h3 class="card__title">${escapeHtml(localize(p.title))}</h3>
            <p class="card__body">${escapeHtml(localize(p.description))}</p>
            ${tags ? `<ul class="card__tags">${tags}</ul>` : ''}
            ${p.url ? `<a class="btn btn--ghost" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('projects.view'))} <i aria-hidden="true">↗</i></a>` : ''}
          </div>
        </li>`;
    })
    .join('');
  observeReveals(grid);
}

// 3D tilt toward the pointer
if (!reducedMotion) {
  grid.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.card');
    if (!card || e.pointerType !== 'mouse') return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty('--ry', `${(px * 12).toFixed(2)}deg`);
    card.style.setProperty('--rx', `${(-py * 12).toFixed(2)}deg`);
  });
  grid.addEventListener(
    'pointerleave',
    (e) => {
      const card = e.target.closest?.('.card');
      if (card) {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      }
    },
    true,
  );
}

// ---------- Reveal on scroll ----------
const revealObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-visible');
              revealObserver.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
      )
    : null;

function observeReveals(root = document) {
  root.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
    if (revealObserver && !reducedMotion) revealObserver.observe(el);
    else el.classList.add('is-visible');
  });
}

// ---------- Language ----------
const toggle = document.getElementById('lang-toggle');
function syncToggle(lang) {
  toggle.querySelectorAll('[data-lang]').forEach((s) => s.classList.toggle('is-active', s.dataset.lang === lang));
}
onLangChange((lang) => {
  syncToggle(lang);
  renderProjects();
});
toggle.addEventListener('click', () => setLang(getLang() === 'en' ? 'es' : 'en'));
initLang();
observeReveals();

// ---------- Nav state ----------
const nav = document.getElementById('nav');
const onScrollNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScrollNav, { passive: true });
onScrollNav();

// ---------- 3D scene (loaded separately so the page text appears first) ----------
const sceneEl = document.getElementById('scene');
import('./scene/world.js')
  .then(({ startWorld }) => startWorld(sceneEl, { reducedMotion }))
  .catch(() => sceneEl.classList.add('no-webgl'));
