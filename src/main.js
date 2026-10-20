// Fonts are self-hosted (no requests to Google): Latin subsets only, which cover English and Spanish.
import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-300-italic.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cormorant-sc/latin-400.css';
import '@fontsource/cormorant-sc/latin-500.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import './styles/main.css';
import './styles/scene.css';
import { site, projects, certifications } from './config.js';
import { initLang, setLang, getLang, onLangChange, t, localize } from './i18n.js';
import { renderAbout } from './ui/about.js';
import { renderBoard } from './ui/board.js';
import { renderContact } from './ui/contact.js';
import { applyFlow, hasWebGL } from './ui/flow.js';
import { mountOverlay } from './ui/overlay.js';
import { orientation } from './scene/orient.js';
import { createMusic, readSoundPref, writeSoundPref } from './audio.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Upright screens show the tall portrait paintings, whose hotspots sit elsewhere.
const viewOrient = () => orientation({ width: window.innerWidth, height: window.innerHeight });
let orient = viewOrient();

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

// ---------- Projects: the quest board ----------
// Re-rendered on language change; the open parchment (if any) stays open.
const boardRoot = document.querySelector('.stage-ui[data-stage="board"]');
let board = null;
function renderProjects() {
  board = renderBoard(boardRoot, { projects, t, localize, openId: board?.openId, orient });
}

// ---------- Contact: links on the desk's parchment ----------
// The raven lives in the 3D scene, which loads after the page; until then the links simply work without it.
const contactRoot = document.querySelector('.stage-ui[data-stage="desk"]');
const ravenProxy = {
  perk: (on) => world?.raven?.perk(on),
  launch: () => world?.raven?.launch(),
};

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
// Scene controls per stage (mounted below, once the page and its controls exist).
const overlays = new Map();

// ---------- Pause motion (WCAG 2.2.2) ----------
// Remembered on this device only. Hidden when the OS already asks for reduced motion (the scene is static then).
const MOTION_KEY = 'portfolio-motion';
const motionToggle = document.getElementById('motion-toggle');
let motionOn = true;
try {
  motionOn = localStorage.getItem(MOTION_KEY) !== 'off';
} catch {
  /* storage unavailable: default to motion on */
}
function syncMotionLabel() {
  motionToggle.textContent = t(motionOn ? 'motion.pause' : 'motion.play');
}
function applyMotion() {
  document.documentElement.classList.toggle('motion-paused', !motionOn);
  world?.setMotion(motionOn);
  syncMotionLabel();
}
if (!reducedMotion) {
  motionToggle.hidden = false;
  motionToggle.addEventListener('click', () => {
    motionOn = !motionOn;
    try {
      localStorage.setItem(MOTION_KEY, motionOn ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    applyMotion();
  });
}

// ---------- Sound (opt-in music) ----------
// Off by default. A saved "on" waits for the first click or key press, since browsers block sound before that.
const soundToggle = document.getElementById('sound-toggle');
const music = createMusic({ src: new URL('./art/audio/night.m4a', import.meta.url).href });
let storage = null;
try {
  storage = window.localStorage;
} catch {
  /* storage unavailable: sound stays off by default */
}
let soundOn = storage ? readSoundPref(storage) : false;
function syncSoundLabel() {
  soundToggle.textContent = t(soundOn ? 'sound.on' : 'sound.off');
  soundToggle.setAttribute('aria-pressed', String(soundOn));
}
if (soundOn) {
  const startOnInput = (e) => {
    document.removeEventListener('click', startOnInput, true);
    document.removeEventListener('keydown', startOnInput, true);
    // The sound button's own click decides for itself.
    if (soundOn && !soundToggle.contains(e.target)) music.setOn(true);
  };
  // Click, not pointerdown: a touch pointerdown isn't a user gesture on phones, so play() would be refused.
  document.addEventListener('click', startOnInput, true);
  document.addEventListener('keydown', startOnInput, true);
}
soundToggle.addEventListener('click', () => {
  soundOn = !soundOn;
  if (storage) writeSoundPref(storage, soundOn);
  music.setOn(soundOn);
  syncSoundLabel();
});

// ---------- Privacy dialog ----------
const privacy = document.getElementById('privacy');
document.getElementById('privacy-open').addEventListener('click', () => privacy.showModal());
document.getElementById('privacy-close').addEventListener('click', () => privacy.close());
privacy.addEventListener('click', (e) => {
  // Click on the backdrop closes it
  if (e.target === privacy) privacy.close();
});
// The scene controls, re-rendered on language change and when the screen turns between upright and wide.
function renderControls() {
  renderAbout(document.querySelector('.stage-ui[data-stage="library"]'), { certifications, t, localize, orient });
  renderProjects();
  renderContact(contactRoot, { links: site.links, t, raven: ravenProxy, reducedMotion, orient });
}
onLangChange((lang) => {
  syncToggle(lang);
  syncMotionLabel();
  syncSoundLabel();
  renderControls();
  // Text length changes section heights, which moves the camera stops.
  for (const overlay of overlays.values()) overlay.refresh();
  world?.remeasure();
});
toggle.addEventListener('click', () => setLang(getLang() === 'en' ? 'es' : 'en'));
initLang();
applyMotion();
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
// Scene controls are mounted and placed now, before the scene loads, so they are never piled in a corner. They
// follow each painting's layout once the scene is up. Without WebGL they drop into the page flow (src/ui/flow.js).
let webgl = hasWebGL();
for (const root of document.querySelectorAll('.stage-ui[data-stage]')) {
  const key = root.dataset.stage;
  const overlay = mountOverlay(root, key, (i) => world?.rect(key, i), glideTo);
  overlay.setActive(false);
  overlays.set(key, overlay);
}
function layoutControls() {
  applyFlow(webgl);
  // Lets CSS size the controls for the tall phone paintings.
  document.documentElement.classList.toggle('is-portrait', viewOrient() === 'portrait');
  if (viewOrient() !== orient) {
    orient = viewOrient();
    renderControls();
    for (const overlay of overlays.values()) overlay.refresh();
  }
  const W = 2 * (window.innerWidth / window.innerHeight);
  for (const overlay of overlays.values()) overlay.place(W, { width: window.innerWidth, height: window.innerHeight });
}
layoutControls();
window.addEventListener('resize', layoutControls);
function noScene() {
  webgl = false;
  sceneEl.classList.add('no-webgl');
  layoutControls();
}
import('./scene/world.js')
  .then(({ startWorld }) => {
    world = startWorld(sceneEl, { reducedMotion, overlays }) ?? null;
    if (!world) noScene();
    applyMotion();
  })
  .catch(noScene);
