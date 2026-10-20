// Edit this file to update your name, links and projects.

export const site = {
  name: 'Miguel Fernández',
  links: {
    instagram: 'https://www.instagram.com/miguelfdz014/',
    github: 'https://github.com/miguelfdz014',
  },
};

// Each project hangs in the Armory as a heraldic shield.
// division: 'plain' | 'pale' | 'chevron' | 'bend' — how the shield's field is divided.
// When a project is ready, set status: 'ready' and add title, description, tags and url.
// Titles and descriptions can be plain strings or { en, es } objects.
export const projects = [
  { status: 'incoming', division: 'plain' },
  { status: 'incoming', division: 'pale' },
  { status: 'incoming', division: 'chevron' },
  // Example of a finished project:
  // {
  //   status: 'ready',
  //   division: 'bend',
  //   title: { en: 'Moonlight Atlas', es: 'Atlas Lunar' },
  //   description: { en: 'An interactive star map.', es: 'Un mapa estelar interactivo.' },
  //   tags: ['React', 'FastAPI'],
  //   url: 'https://github.com/miguelfdz014/moonlight-atlas',
  // },
];
