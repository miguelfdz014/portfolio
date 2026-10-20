// Contact: Miguel's links written on the parchment on the desk. Hovering one perks the raven up; clicking opens the
// link straight away (never delayed) while the raven carries a sealed letter off toward the moon.
import hotspots from '../art/hotspots.json';

const [u, v] = hotspots.desk.parchment;

const LINKS = [
  ['instagram', 'Instagram', '@miguelfdz014'],
  ['github', 'GitHub', 'miguelfdz014'],
];

export function renderContact(root, { links, t, raven, reducedMotion }) {
  root.replaceChildren();
  // The links sit in the parchment's top third, leaving room below for a real form later.
  const letter = document.createElement('div');
  letter.className = 'letter';
  letter.dataset.art = `0,${u + 0.07},${v - 0.04}`;
  const seal = document.createElement('span');
  seal.className = 'letter__seal';
  seal.setAttribute('aria-hidden', 'true');

  for (const [key, label, handle] of LINKS) {
    const a = document.createElement('a');
    Object.assign(a, { href: links[key], target: '_blank', rel: 'noopener noreferrer' });
    a.dataset.link = key;
    a.className = 'letter__line';
    for (const [cls, text] of [['letter__label', label], ['letter__handle', handle], ['visually-hidden', `, ${t('contact.newTab')}`]]) {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      a.append(span);
    }
    for (const type of ['pointerenter', 'focus']) a.addEventListener(type, () => raven?.perk(true));
    for (const type of ['pointerleave', 'blur']) a.addEventListener(type, () => raven?.perk(false));
    a.addEventListener('click', () => {
      if (reducedMotion) return;
      raven?.launch(performance.now());
      seal.classList.remove('is-stamped');
      void seal.offsetWidth; // Restart the stamp animation.
      seal.classList.add('is-stamped');
    });
    letter.append(a);
  }
  letter.append(seal);
  root.append(letter);
}
