const STORAGE_KEY = 'portfolio-lang';

export const dictionaries = {
  en: {
    'nav.about': 'About',
    'nav.projects': 'Projects',
    'nav.contact': 'Contact',
    'hero.eyebrow': 'Under the pale moon',
    'hero.subtitle': 'Developer & digital craftsman — forging things for the web, one stone at a time.',
    'hero.cta': 'Enter the castle',
    'hero.scroll': 'Scroll',
    'about.kicker': 'Chapter I',
    'about.title': 'The Chronicle',
    'about.body1':
      'I am Miguel, a developer who builds with the patience of a stonemason and the curiosity of a night-time wanderer. I love turning ideas into experiences that feel crafted, not assembled.',
    'about.body2':
      'This keep is still being raised. New halls — projects, experiments and stories — will open here soon.',
    'projects.kicker': 'Chapter II',
    'projects.title': 'The Armory',
    'projects.lead': 'Works sealed in wax, waiting for their moment to be revealed.',
    'projects.incoming': 'Project incoming',
    'projects.incomingBody': 'This scroll is still being written. Return when the moon is full.',
    'projects.sealed': 'Sealed',
    'projects.view': 'View project',
    'contact.kicker': 'Chapter III',
    'contact.title': 'Send a Raven',
    'contact.lead': 'Want to build something together, or just say hello? My gates are open.',
    'footer.made': 'Forged under moonlight',
    'lang.label': 'Switch language',
  },
  es: {
    'nav.about': 'Sobre mí',
    'nav.projects': 'Proyectos',
    'nav.contact': 'Contacto',
    'hero.eyebrow': 'Bajo la luna pálida',
    'hero.subtitle': 'Desarrollador y artesano digital — forjando cosas para la web, piedra a piedra.',
    'hero.cta': 'Entrar al castillo',
    'hero.scroll': 'Desliza',
    'about.kicker': 'Capítulo I',
    'about.title': 'La Crónica',
    'about.body1':
      'Soy Miguel, un desarrollador que construye con la paciencia de un cantero y la curiosidad de un viajero nocturno. Me encanta convertir ideas en experiencias que se sienten forjadas, no ensambladas.',
    'about.body2':
      'Esta fortaleza aún se está levantando. Pronto se abrirán aquí nuevas salas: proyectos, experimentos e historias.',
    'projects.kicker': 'Capítulo II',
    'projects.title': 'La Armería',
    'projects.lead': 'Obras selladas en cera, esperando su momento para ser reveladas.',
    'projects.incoming': 'Proyecto en camino',
    'projects.incomingBody': 'Este pergamino aún se está escribiendo. Vuelve cuando la luna esté llena.',
    'projects.sealed': 'Sellado',
    'projects.view': 'Ver proyecto',
    'contact.kicker': 'Capítulo III',
    'contact.title': 'Envía un Cuervo',
    'contact.lead': '¿Quieres construir algo juntos o solo saludar? Mis puertas están abiertas.',
    'footer.made': 'Forjado bajo la luz de la luna',
    'lang.label': 'Cambiar idioma',
  },
};

let current = 'en';
const listeners = new Set();

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable — choice just won't persist */
  }
}

export function t(key) {
  return dictionaries[current][key] ?? dictionaries.en[key] ?? key;
}

// Resolves a string or { en, es } object to the current language.
export function localize(value) {
  if (value && typeof value === 'object') return value[current] ?? value.en;
  return value;
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = dictionaries[lang] ? lang : 'en';
  store(current);
  document.documentElement.lang = current;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  listeners.forEach((fn) => fn(current));
}

export function onLangChange(fn) {
  listeners.add(fn);
}

export function initLang() {
  const stored = readStored();
  const browser = (navigator.language || 'en').slice(0, 2);
  setLang(stored || (browser === 'es' ? 'es' : 'en'));
}
