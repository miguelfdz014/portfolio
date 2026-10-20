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
    'descent.line': 'Beneath the moon, a castle wakes among the roses.',
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
    'about.book': 'The chronicle',
    'about.scrolls': 'Certifications',
    'cert.label': '{name}, {issuer}: {status}',
    'cert.status.progress': 'in progress',
    'cert.status.awaiting': 'awaiting',
    'about.hobby.lifting': 'Weightlifting: iron, patience and progress',
    'about.hobby.camera': 'Black-and-white photography',
    'about.hobby.photos': 'Prints from my black-and-white photography',
    'about.hobby.dragon': 'World of Warcraft',
    'projects.kicker': 'Chapter II',
    'projects.title': 'The Quest Board',
    'projects.lead': "Every quest I've taken on, pinned and sealed. Break a seal to read it.",
    'board.sealed': 'Sealed: not yet revealed',
    'board.close': 'Roll it back up',
    'board.next': 'Next notice board',
    'projects.view': 'View on GitHub',
    'contact.kicker': 'Chapter III',
    'contact.title': 'Send a Raven',
    'contact.lead': 'Send a raven: write to me on Instagram or GitHub.',
    'contact.newTab': 'opens in a new tab',
    'footer.made': 'Forged under moonlight',
    'footer.rights': 'All rights reserved.',
    'footer.credits': 'Credits',
    'motion.pause': 'Pause motion',
    'motion.play': 'Play motion',
    'sound.on': 'Sound on',
    'sound.off': 'Sound off',
    'privacy.link': 'Privacy',
    'privacy.title': 'Privacy',
    'privacy.p1': "This site doesn't use cookies, analytics or trackers, and it doesn't collect any personal data.",
    'privacy.p2': 'Your language, motion and sound choices are saved only in your own browser and never leave your device.',
    'privacy.p3': 'The site is hosted on Cloudflare Pages, which processes technical data such as your IP address to deliver the page and protect it from abuse.',
    'privacy.cloudflare': "Cloudflare's privacy policy",
    'privacy.p4': 'Links to Instagram and GitHub take you to those services, which have their own privacy policies.',
    'privacy.close': 'Close',
    'lang.label': 'EN/ES, switch language',
  },
  es: {
    'nav.about': 'Sobre mí',
    'nav.projects': 'Proyectos',
    'nav.contact': 'Contacto',
    'hero.eyebrow': 'Bajo la luna pálida',
    'hero.subtitle': 'Desarrollador de software: frontend, backend, datos e IA. Forjando cosas para la web, piedra a piedra.',
    'hero.cta': 'Comenzar el descenso',
    'hero.scroll': 'Desliza',
    'descent.line': 'Bajo la luna, un castillo despierta entre las rosas.',
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
    'about.book': 'La crónica',
    'about.scrolls': 'Certificaciones',
    'cert.label': '{name}, {issuer}: {status}',
    'cert.status.progress': 'en curso',
    'cert.status.awaiting': 'pendiente',
    'about.hobby.lifting': 'Halterofilia: hierro, paciencia y progreso',
    'about.hobby.camera': 'Fotografía en blanco y negro',
    'about.hobby.photos': 'Copias de mi fotografía en blanco y negro',
    'about.hobby.dragon': 'World of Warcraft',
    'projects.kicker': 'Capítulo II',
    'projects.title': 'El tablón de misiones',
    'projects.lead': 'Cada misión que he aceptado, clavada y sellada. Rompe un sello para leerla.',
    'board.sealed': 'Sellado: aún sin revelar',
    'board.close': 'Volver a enrollar',
    'board.next': 'Siguiente tablón',
    'projects.view': 'Ver en GitHub',
    'contact.kicker': 'Capítulo III',
    'contact.title': 'Envía un Cuervo',
    'contact.lead': 'Envía un cuervo: escríbeme por Instagram o GitHub.',
    'contact.newTab': 'se abre en una pestaña nueva',
    'footer.made': 'Forjado bajo la luz de la luna',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.credits': 'Créditos',
    'motion.pause': 'Pausar movimiento',
    'motion.play': 'Reanudar movimiento',
    'sound.on': 'Sonido activado',
    'sound.off': 'Sonido desactivado',
    'privacy.link': 'Privacidad',
    'privacy.title': 'Privacidad',
    'privacy.p1': 'Este sitio no usa cookies, analíticas ni rastreadores, y no recoge ningún dato personal.',
    'privacy.p2': 'Tus preferencias de idioma, movimiento y sonido se guardan solo en tu propio navegador y nunca salen de tu dispositivo.',
    'privacy.p3': 'El sitio está alojado en Cloudflare Pages, que procesa datos técnicos como tu dirección IP para servir la página y protegerla de abusos.',
    'privacy.cloudflare': 'Política de privacidad de Cloudflare',
    'privacy.p4': 'Los enlaces a Instagram y GitHub te llevan a esos servicios, que tienen sus propias políticas de privacidad.',
    'privacy.close': 'Cerrar',
    'lang.label': 'EN/ES, cambiar idioma',
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

// Optional vars fill {placeholders}: t('cert.label', { name, issuer, status }).
export function t(key, vars) {
  const text = dictionaries[current][key] ?? dictionaries.en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) : text;
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
