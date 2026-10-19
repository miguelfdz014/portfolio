import './styles/main.css';
import './styles/scene.css';
import { site, projects } from './config.js';
import { initLang, setLang, getLang, onLangChange, t, localize } from './i18n.js';
import { startSky } from './scene/sky.js';
import { startPetals } from './scene/petals.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Links ----------
document.querySelectorAll('[data-link]').forEach((a) => {
  a.href = site.links[a.dataset.link];
});
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Projects ----------
const grid = document.getElementById('projects-grid');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderProjects() {
  grid.innerHTML = projects
    .map((p, i) => {
      const delay = `style="--delay:${i * 120}ms"`;
      if (p.status !== 'ready') {
        return `
          <li class="card card--sealed reveal" ${delay}>
            <span class="card__numeral">${escapeHtml(p.numeral ?? '')}</span>
            <div class="card__seal" aria-hidden="true">
              <svg viewBox="0 0 64 64"><use href="#icon-seal" /></svg>
              <svg class="card__seal-rose" viewBox="0 0 24 24"><use href="#icon-rose" /></svg>
            </div>
            <h3 class="card__title">${escapeHtml(t('projects.incoming'))}</h3>
            <p class="card__body">${escapeHtml(t('projects.incomingBody'))}</p>
            <span class="card__badge">${escapeHtml(t('projects.sealed'))}</span>
          </li>`;
      }
      const tags = (p.tags ?? []).map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');
      return `
        <li class="card reveal" ${delay}>
          <span class="card__numeral">${escapeHtml(p.numeral ?? '')}</span>
          <h3 class="card__title">${escapeHtml(localize(p.title))}</h3>
          <p class="card__body">${escapeHtml(localize(p.description))}</p>
          ${tags ? `<ul class="card__tags">${tags}</ul>` : ''}
          ${p.url ? `<a class="btn btn--ghost" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('projects.view'))}</a>` : ''}
        </li>`;
    })
    .join('');
  observeReveals(grid);
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

// ---------- Scene ----------
startSky(document.getElementById('stars'), { reducedMotion });
startPetals(document.getElementById('petals'), { reducedMotion });

if (!reducedMotion) {
  const hero = document.getElementById('hero');
  const layers = [...document.querySelectorAll('.layer')].map((el) => ({ el, depth: parseFloat(el.dataset.depth) }));
  let mx = 0;
  let my = 0;
  let cx = 0;
  let cy = 0;
  let scrollY = window.scrollY;
  let ticking = false;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      schedule();
    },
    { passive: true },
  );
  window.addEventListener(
    'scroll',
    () => {
      scrollY = window.scrollY;
      schedule();
    },
    { passive: true },
  );

  function schedule() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function update() {
    ticking = false;
    // Ease pointer movement for a floaty feel.
    cx += (mx - cx) * 0.08;
    cy += (my - cy) * 0.08;
    if (scrollY < hero.offsetHeight * 1.2) {
      for (const { el, depth } of layers) {
        const x = -cx * depth * 40;
        const y = -cy * depth * 20 + scrollY * depth * 0.5;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
    }
    if (Math.abs(mx - cx) > 0.001 || Math.abs(my - cy) > 0.001) schedule();
  }
}
