// Edit this file to update your name, links and projects.

export const site = {
  name: 'Miguel Fernández',
  links: {
    instagram: 'https://www.instagram.com/miguelfdz014/',
    github: 'https://github.com/miguelfdz014',
  },
};

// Each project is a parchment on the quest board: 'incoming' stays sealed; 'ready' unrolls into its details.
// When a project is ready, set status: 'ready' and add title, description, tags and url.
// Titles and descriptions can be plain strings or { en, es } objects.
export const projects = [
  { status: 'incoming' },
  { status: 'incoming' },
  { status: 'incoming' },
  // Example of a finished project:
  // {
  //   status: 'ready',
  //   title: { en: 'Moonlight Atlas', es: 'Atlas Lunar' },
  //   description: { en: 'An interactive star map.', es: 'Un mapa estelar interactivo.' },
  //   tags: ['React', 'FastAPI'],
  //   url: 'https://github.com/miguelfdz014/moonlight-atlas',
  // },
];

// Certifications appear as scrolls on the library shelf: status 'progress' (unrolled) or 'awaiting' (sealed).
export const certifications = [
  { id: 'rwd', name: { en: 'Responsive Web Design', es: 'Diseño web responsive' }, issuer: 'freeCodeCamp', status: 'progress' },
  { id: 'python', name: 'Python', issuer: 'freeCodeCamp', status: 'progress' },
  { id: 'js', name: 'JavaScript', issuer: 'freeCodeCamp', status: 'awaiting' },
  { id: 'fedl', name: { en: 'Front End Development Libraries', es: 'Bibliotecas de desarrollo front end' }, issuer: 'freeCodeCamp', status: 'awaiting' },
  { id: 'rdb', name: { en: 'Relational Databases', es: 'Bases de datos relacionales' }, issuer: 'freeCodeCamp', status: 'awaiting' },
  { id: 'claude', name: { en: 'Claude with the Anthropic API', es: 'Claude con la API de Anthropic' }, issuer: 'Anthropic Academy', status: 'awaiting' },
  { id: 'cyber', name: { en: 'Introduction to Cybersecurity', es: 'Introducción a la ciberseguridad' }, issuer: 'Cisco', status: 'awaiting' },
];
