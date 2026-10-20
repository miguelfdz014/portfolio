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

// Heater-shield outline, viewBox 0 0 200 240.
const SHIELD = 'M12 8H188V104C188 168 148 210 100 232C52 210 12 168 12 104Z';
const DIVISIONS = {
  plain: '',
  pale: '<path class="arms__division" d="M100 8V232" />',
  chevron: '<path class="arms__division" d="M14 196L100 104L186 196" />',
  bend: '<path class="arms__division" d="M12 8L188 200" />',
};

function shieldSvg(p, i) {
  const id = `arms-clip-${i}`;
  const ready = p.status === 'ready';
  // A finished project carries its initial as the charge; a blank one shows an empty inescutcheon.
  const charge = ready
    ? `<text class="arms__charge" x="100" y="146" text-anchor="middle">${escapeHtml(String(localize(p.title) ?? '?').charAt(0))}</text>`
    : `<path class="arms__empty" d="${SHIELD}" transform="translate(100 118) scale(0.3) translate(-100 -120)" />`;
  return `
    <svg class="arms__shield" viewBox="0 0 200 240" aria-hidden="true">
      <defs><clipPath id="${id}"><path d="${SHIELD}" /></clipPath></defs>
      <g clip-path="url(#${id})">
        <rect width="200" height="240" fill="#050506" />
        <rect width="200" height="240" fill="url(#hatch-sable)" />
        <rect class="arms__gules" width="200" height="240" fill="url(#hatch-gules)" />
        ${DIVISIONS[p.division] ?? ''}
        ${charge}
      </g>
      <path class="arms__edge" d="${SHIELD}" />
      <path class="arms__edge arms__edge--inner" d="${SHIELD}" transform="translate(100 120) scale(0.92) translate(-100 -120)" />
    </svg>`;
}

function renderProjects() {
  grid.innerHTML = projects
    .map((p, i) => {
      const delay = `style="--delay:${i * 120}ms"`;
      if (p.status !== 'ready') {
        return `
          <li class="arms arms--blank reveal" ${delay}>
            <div class="arms__hang">${shieldSvg(p, i)}</div>
            <h3 class="arms__title">${escapeHtml(t('projects.incoming'))}</h3>
            <p class="arms__blazon">${escapeHtml(t(`blazon.${p.division ?? 'plain'}`))}</p>
            <p class="arms__note">${escapeHtml(t('projects.status'))}</p>
          </li>`;
      }
      const tags = (p.tags ?? []).map(escapeHtml).join(', ');
      return `
        <li class="arms reveal" ${delay}>
          <a class="arms__link" href="${escapeHtml(p.url ?? site.links.github)}" target="_blank" rel="noopener noreferrer">
            <div class="arms__hang">${shieldSvg(p, i)}</div>
            <h3 class="arms__title">${escapeHtml(localize(p.title))}</h3>
          </a>
          <p class="arms__blazon">${escapeHtml(localize(p.description))}</p>
          ${tags ? `<p class="arms__note">${tags}</p>` : ''}
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
let world = null;
onLangChange((lang) => {
  syncToggle(lang);
  renderProjects();
  // Text length changes section heights, which moves the camera stops.
  world?.remeasure();
});
toggle.addEventListener('click', () => setLang(getLang() === 'en' ? 'es' : 'en'));
initLang();
observeReveals();

// ---------- Cinematic scroll for in-page links ----------
// A slow glide so the camera's descent is actually seen; any user input takes back control.
let glide = 0;
function cancelGlide() {
  cancelAnimationFrame(glide);
  glide = 0;
}
['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) =>
  window.addEventListener(type, () => glide && cancelGlide(), { passive: true }),
);

function glideTo(el) {
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  const r = el.getBoundingClientRect();
  // Sections are framed when centred, which is where the camera reaches each stop.
  const centred = r.top + window.scrollY + Math.min(r.height, vh * 3) / 2 - vh / 2;
  const target = Math.max(0, Math.min(max, el.id === 'hero' ? 0 : centred));
  const from = window.scrollY;
  const dist = Math.abs(target - from);
  if (reducedMotion || dist < 4) {
    window.scrollTo({ top: target, behavior: 'instant' });
    return;
  }
  const duration = Math.min(Math.max((dist / vh) * 1800, 1400), 9000);
  const t0 = performance.now();
  cancelGlide();
  const step = (now) => {
    const p = Math.min((now - t0) / duration, 1);
    const e = 0.5 - Math.cos(Math.PI * p) / 2; // ease in and out
    window.scrollTo({ top: from + (target - from) * e, behavior: 'instant' });
    glide = p < 1 ? requestAnimationFrame(step) : 0;
  };
  glide = requestAnimationFrame(step);
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.classList.contains('skip-link')) return;
  const el = document.querySelector(a.getAttribute('href'));
  if (!el) return;
  e.preventDefault();
  glideTo(el);
  history.replaceState(null, '', a.getAttribute('href'));
});

// ---------- Nav state ----------
const nav = document.getElementById('nav');
const onScrollNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScrollNav, { passive: true });
onScrollNav();

// ---------- 3D scene (loaded separately so the page text appears first) ----------
const sceneEl = document.getElementById('scene');
import('./scene/world.js')
  .then(({ startWorld }) => {
    world = startWorld(sceneEl, { reducedMotion }) ?? null;
  })
  .catch(() => sceneEl.classList.add('no-webgl'));
