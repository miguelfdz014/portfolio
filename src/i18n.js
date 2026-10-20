const STORAGE_KEY = 'portfolio-lang';

export const dictionaries = {
  en: {
    'nav.about': 'About',
    'nav.projects': 'Projects',
    'nav.contact': 'Contact',
    'hero.eyebrow': 'Under the pale moon',
    'hero.subtitle': 'Software developer: frontend, backend, data and AI. Forging things for the web, one stone at a time.',
    'hero.cta': 'Begin the descent',
    'hero.scroll': 'Scroll',
    'descent.line': 'Beyond the clouds, a fortress rises from the sea.',
    'about.kicker': 'Chapter I',
    'about.title': 'The Chronicle',
    'about.body1':
      'My name is Miguel. I build for the web as a software developer: frontend, backend, data and AI features. Most of my work is personal projects, experiments, and things I take apart to understand them better.',
    'about.body2':
      'Away from the keyboard: weightlifting, World of Warcraft and black-and-white photography, which explains the colours here.',
    'stack.frontend': 'Frontend',
    'stack.backend': 'Backend',
    'stack.data': 'Data',
    'stack.ai': 'AI',
    'stack.tools': 'Tools',
    'stack.training': 'Training',
    'stack.trainingValue': 'freeCodeCamp: Responsive Web Design, Python',
    'projects.kicker': 'Chapter II',
    'projects.title': 'The Armory',
    'projects.lead': 'Every finished project earns a coat of arms. These shields are still blank.',
    'projects.incoming': 'Project incoming',
    'projects.status': 'At the forge, arriving soon.',
    'blazon.plain': 'Sable, awaiting its charge.',
    'blazon.pale': 'Party per pale, yet unpainted.',
    'blazon.chevron': 'Sable, a chevron yet unpainted.',
    'blazon.bend': 'Party per bend, yet unpainted.',
    'projects.view': 'View on GitHub',
    'contact.kicker': 'Chapter III',
    'contact.title': 'Send a Raven',
    'contact.lead': 'Have an idea, a project, or just want to say hello? Write to me on Instagram or GitHub.',
    'footer.made': 'Forged under moonlight',
    'lang.label': 'Switch language',
  },
  es: {
    'nav.about': 'Sobre mí',
    'nav.projects': 'Proyectos',
    'nav.contact': 'Contacto',
    'hero.eyebrow': 'Bajo la luna pálida',
    'hero.subtitle': 'Desarrollador de software: frontend, backend, datos e IA. Forjando cosas para la web, piedra a piedra.',
    'hero.cta': 'Comenzar el descenso',
    'hero.scroll': 'Desliza',
    'descent.line': 'Más allá de las nubes, una fortaleza se alza sobre el mar.',
    'about.kicker': 'Capítulo I',
    'about.title': 'La Crónica',
    'about.body1':
      'Me llamo Miguel. Construyo para la web como desarrollador de software: frontend, backend, datos y funciones de IA. La mayor parte de mi trabajo son proyectos personales, experimentos y cosas que desarmo para entenderlas mejor.',
    'about.body2':
      'Lejos del teclado: halterofilia, World of Warcraft y fotografía en blanco y negro, lo que explica los colores de esta página.',
    'stack.frontend': 'Frontend',
    'stack.backend': 'Backend',
    'stack.data': 'Datos',
    'stack.ai': 'IA',
    'stack.tools': 'Herramientas',
    'stack.training': 'Formación',
    'stack.trainingValue': 'freeCodeCamp: Diseño web responsivo, Python',
    'projects.kicker': 'Capítulo II',
    'projects.title': 'La Armería',
    'projects.lead': 'Cada proyecto terminado gana su escudo de armas. Estos aún están en blanco.',
    'projects.incoming': 'Proyecto en camino',
    'projects.status': 'En la forja, llega pronto.',
    'blazon.plain': 'Sable, a la espera de su figura.',
    'blazon.pale': 'Partido, aún sin esmaltar.',
    'blazon.chevron': 'Sable, un cheurón aún sin esmaltar.',
    'blazon.bend': 'Tronchado, aún sin esmaltar.',
    'projects.view': 'Ver en GitHub',
    'contact.kicker': 'Capítulo III',
    'contact.title': 'Envía un Cuervo',
    'contact.lead': '¿Tienes una idea, un proyecto o solo quieres saludar? Escríbeme por Instagram o GitHub.',
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
