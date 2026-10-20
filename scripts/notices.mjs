// Writes public/third-party-notices.txt from the licences of the bundled dependencies.
// Run with `npm run notices` after changing dependencies.
import { readFileSync, writeFileSync } from 'node:fs';

const deps = ['three', '@fontsource/cormorant-garamond', '@fontsource/cormorant-sc', '@fontsource/eb-garamond'];
const root = new URL('../', import.meta.url);
const parts = [
  'Third-party notices',
  '===================',
  '',
  'This site bundles the following open-source software and fonts.',
  'Everything else on the site is © Miguel Fernández. All rights reserved.',
  '',
];
for (const name of deps) {
  const pkg = JSON.parse(readFileSync(new URL(`node_modules/${name}/package.json`, root)));
  const licence = readFileSync(new URL(`node_modules/${name}/LICENSE`, root), 'utf8').trim();
  parts.push('-'.repeat(72), `${pkg.name} ${pkg.version} (${pkg.license})`, pkg.homepage ?? '', '', licence, '');
}
writeFileSync(new URL('public/third-party-notices.txt', root), parts.join('\n'));
console.log('wrote public/third-party-notices.txt');
