// Draws the README's illuminated-manuscript art as animated SVGs into docs/readme/.
//   npm run readme-art
// Everything is code: vellum, ink and crimson, with night scenes in the site's moonlit blue. Cormorant is embedded
// in each SVG (SIL OFL) because GitHub shows README images without loading outside fonts.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('docs/readme');
fs.mkdirSync(OUT, { recursive: true });

// ---------- shared ----------
const C = {
  vellum: '#efe8da', ink: '#050506', crimson: '#c8102e', crimsonDeep: '#8b0a1f', brown: '#3a2a20',
  sky0: '#08112a', sky1: '#1c2c55', moon: '#eef2f8', cloud: '#141d36', cloudLit: '#5d6a8c',
  far: '#33477a', mid: '#1d2b4e', near: '#142039', forest: '#0a1224', castle: '#0d1527', rock: '#121c33',
  mist: '#dfe7f5', win: '#ff3550', flame: '#ffcf7a',
};

// Paper grain baked into a small tile, so the page never computes noise while things animate on top of it.
const GRAIN = await (async () => {
  const N = 128, px = Buffer.alloc(N * N * 4);
  let g = 3;
  for (let i = 0; i < N * N; i++) {
    g = (g * 16807) % 2147483647;
    px.set([58, 40, 26, Math.round((g / 2147483647) * 34)], i * 4);
  }
  return (await sharp(px, { raw: { width: N, height: N, channels: 4 } }).png().toBuffer()).toString('base64');
})();

const f = (n) => (Math.round(n * 10) / 10).toString();
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const r = (a, b) => a + (b - a) * rnd();

const FONT_FILES = {
  display: ['Cormorant Garamond', 'normal', 'node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2'],
  italic: ['Cormorant Garamond', 'italic', 'node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2'],
  caps: ['Cormorant SC', 'normal', 'node_modules/@fontsource/cormorant-sc/files/cormorant-sc-latin-500-normal.woff2'],
};
const fontFaces = (...keys) => keys.map((k) => {
  const [family, style, file] = FONT_FILES[k];
  const data = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:'${family}';font-style:${style};src:url(data:font/woff2;base64,${data}) format('woff2')}`;
}).join('');
const SERIF = "'Cormorant Garamond', Georgia, serif";
const CAPS = "'Cormorant SC', 'Cormorant Garamond', Georgia, serif";

// Keyframes shared by every piece (each SVG is its own document, so names can repeat).
const KEYFRAMES = `
@keyframes glow{0%,100%{opacity:.6}40%{opacity:1}70%{opacity:.8}}
@keyframes tw{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes drift{from{transform:translateX(-10px)}to{transform:translateX(10px)}}
@keyframes flap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(-.6)}}
@keyframes flick{0%,100%{transform:scale(1,1)}30%{transform:scale(.92,1.08)}60%{transform:scale(1.05,.95)}}
@keyframes fall{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:1}100%{transform:translate(-120px,260px) rotate(480deg);opacity:0}}
@keyframes sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
.win{animation:glow 2.8s ease-in-out infinite}
.tw{animation:tw 3.4s ease-in-out infinite}
.drift{animation:drift 14s ease-in-out infinite alternate}
.wing{animation:flap .5s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.flame{animation:flick 1.3s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.petal{animation:fall 10s linear infinite;transform-box:fill-box;transform-origin:center}
.sway{animation:sway 4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 0}
.sketch *{fill:none!important;stroke:#6b5a48!important;stroke-width:1px!important;animation:none!important}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

const svg = (w, h, title, defs, body, fonts = []) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
<title>${title}</title>
<defs><style>${fontFaces(...fonts)}${KEYFRAMES}</style>
${body.includes('url(#grain)') ? `<pattern id="grain" width="128" height="128" patternUnits="userSpaceOnUse"><image width="128" height="128" href="data:image/png;base64,${GRAIN}"/></pattern>` : ''}
<radialGradient id="puffCloud"><stop offset=".35" stop-color="${C.cloud}"/><stop offset="1" stop-color="${C.cloud}" stop-opacity="0"/></radialGradient>
<radialGradient id="puffMist"><stop offset=".2" stop-color="${C.mist}"/><stop offset="1" stop-color="${C.mist}" stop-opacity="0"/></radialGradient>
<radialGradient id="puffLit"><stop offset=".2" stop-color="${C.cloudLit}"/><stop offset="1" stop-color="${C.cloudLit}" stop-opacity="0"/></radialGradient>
<radialGradient id="age" cx="50%" cy="50%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a1a0c" stop-opacity=".35"/></radialGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.sky0}"/><stop offset="1" stop-color="${C.sky1}"/></linearGradient>
<radialGradient id="halo"><stop offset=".6" stop-color="${C.moon}" stop-opacity=".35"/><stop offset="1" stop-color="${C.moon}" stop-opacity="0"/></radialGradient>
<radialGradient id="warm"><stop offset="0" stop-color="${C.flame}" stop-opacity=".55"/><stop offset="1" stop-color="${C.flame}" stop-opacity="0"/></radialGradient>
<symbol id="rose" viewBox="0 0 60 60">
  <path d="M10 44 Q18 34 30 40 Q22 50 10 44Z" fill="${C.ink}"/><path d="M50 46 Q42 36 31 42 Q38 52 50 46Z" fill="${C.ink}"/>
  <circle cx="30" cy="28" r="16" fill="${C.crimsonDeep}"/>
  <path d="M16 28 Q16 14 30 13 Q44 14 44 28 Q38 20 30 21 Q22 20 16 28Z" fill="${C.crimson}"/>
  <path d="M20 31 Q22 21 30 22 Q38 22 40 31 Q35 26 30 27 Q24 26 20 31Z" fill="${C.crimson}"/>
  <path d="M24 30 Q26 24 30 25 Q34 24 36 30 Q30 27 24 30Z" fill="${C.crimsonDeep}"/>
  <path d="M18 34 Q30 46 42 34 Q36 42 30 42 Q24 42 18 34Z" fill="${C.crimson}"/></symbol>
<symbol id="raven" viewBox="0 0 60 30"><path d="M22 16 Q30 12 40 15 L48 13 L44 17 Q36 21 26 20Z"/>
  <path class="wing" d="M28 16 Q20 2 6 4 Q18 8 24 18Z"/><path class="wing" d="M32 16 Q42 2 56 6 Q44 9 36 18Z"/></symbol>
${defs}</defs>
${body}
</svg>
`;

// The vellum page every piece is drawn on: paper, double rule, crimson corners, grain and aged edges.
const page = (w, h, inner) => `<rect width="${w}" height="${h}" fill="${C.vellum}"/>
<rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="${C.ink}" stroke-width="3"/>
<rect x="19" y="19" width="${w - 38}" height="${h - 38}" fill="none" stroke="${C.crimson}" stroke-width="1.5"/>
<g fill="${C.crimson}"><path d="M19 19 l18 0 l-18 18Z"/><path d="M${w - 19} 19 l-18 0 l18 18Z"/><path d="M19 ${h - 19} l18 0 l-18 -18Z"/><path d="M${w - 19} ${h - 19} l-18 0 l18 -18Z"/></g>
${inner}
<rect width="${w}" height="${h}" fill="url(#grain)"/><rect width="${w}" height="${h}" fill="url(#age)"/>`;

// A gothic arched window: path, crimson frame and inner ink line.
const archPath = (x0, x1, y0, y1, spring) => {
  const cx = (x0 + x1) / 2;
  return `M${x0} ${y1} V${spring} Q${x0} ${y0} ${cx} ${y0 - 4} Q${x1} ${y0} ${x1} ${spring} V${y1}Z`;
};
const archFrame = (d, id, scene, sw = 4) => `<clipPath id="${id}"><path d="${d}"/></clipPath>
<path d="${d}" fill="${C.ink}"/><g clip-path="url(#${id})">${scene}</g><path d="${d}" fill="none" stroke="${C.crimson}" stroke-width="${sw}"/>`;

const stars = (x0, x1, y0, y1, n) => `<g fill="${C.moon}">${Array.from({ length: n }, () => `<circle class="tw" style="animation-delay:${f(r(0, 3))}s" cx="${f(r(x0, x1))}" cy="${f(r(y0, y1))}" r="${f(r(0.5, 1.3))}"/>`).join('')}</g>`;

function pines(x0, x1, baseY, minH, maxH, color, bottom) {
  let d = '';
  for (let x = x0 - 6; x < x1 + 6; x += r(5, 9)) {
    const h = r(minH, maxH), w = h * r(0.32, 0.42), y = baseY + r(-4, 4);
    d += `M${f(x)} ${f(y - h)} L${f(x + w / 2)} ${f(y + 2)} L${f(x - w / 2)} ${f(y + 2)}Z`;
  }
  let g = `M${x0 - 10} ${bottom} L${x0 - 10} ${baseY}`;
  for (let x = x0 - 10; x <= x1 + 10; x += 30) g += ` Q${f(x + 15)} ${f(baseY - 4)} ${f(x + 30)} ${baseY}`;
  return `<path d="${d}" fill="${color}"/><path d="${g} L${x1 + 10} ${bottom}Z" fill="${color}"/>`;
}

function ridge(x0, x1, baseY, amp, step, jag, bottom) {
  let d = `M${x0 - 10} ${bottom} L${x0 - 10} ${f(baseY)}`;
  for (let x = x0 - 10; x <= x1 + 10; x += step) d += ` L${f(x)} ${f(baseY - Math.abs(Math.sin(x * 0.013 + seed)) * amp - r(0, jag))}`;
  return `${d} L${x1 + 10} ${bottom}Z`;
}

function tower(x, base, h, w) {
  const top = base - h, sp = h * 0.55;
  return `<rect x="${f(x - w / 2)}" y="${f(top)}" width="${f(w)}" height="${f(h)}"/>`
    + `<path d="M${f(x - w / 2 - 1)} ${f(top)} L${f(x)} ${f(top - sp)} L${f(x + w / 2 + 1)} ${f(top)}Z"/>`
    + `<path d="M${f(x - w / 2)} ${f(top + 2)} l1.6 -9 l1.6 9Z M${f(x + w / 2 - 3.2)} ${f(top + 2)} l1.6 -9 l1.6 9Z"/>`;
}

// The castle on its crag, centred on cx with its wall standing on y = base. bridgeTo: x the arcade bridge runs to.
function castle(cx, base, bridgeTo) {
  const T = [[0, 120, 15], [-17, 92, 11], [17, 92, 11], [-33, 70, 10], [33, 74, 10], [-50, 52, 9], [49, 56, 9],
    [-66, 38, 8], [64, 40, 8], [-8, 66, 9], [8, 68, 9], [-24, 54, 8], [25, 50, 8], [-80, 26, 7], [79, 28, 7]];
  let g = `<g fill="${C.castle}">`;
  let wall = `M${cx - 96} ${base + 6} L${cx - 92} ${base - 26}`;
  for (let x = cx - 92; x < cx + 92; x += 8) wall += ' h4 v-4 h4 v4';
  g += `<path d="${wall} L${cx + 96} ${base + 6}Z"/>`;
  for (const [dx, h, w] of [...T].sort((a, b) => b[1] - a[1])) g += tower(cx + dx, base - 26, h, w);
  g += `<path d="M${cx - 50} ${base - 70} Q${cx - 70} ${base - 60} ${cx - 76} ${base - 26} h4 Q${cx - 66} ${base - 56} ${cx - 50} ${base - 64}Z"/>`;
  g += `<path d="M${cx + 50} ${base - 70} Q${cx + 70} ${base - 60} ${cx + 76} ${base - 26} h-4 Q${cx + 66} ${base - 56} ${cx + 50} ${base - 64}Z"/>`;
  g += '</g>';
  if (bridgeTo) {
    g += `<g fill="none" stroke="${C.castle}"><path d="M${cx + 90} ${base - 20} H${bridgeTo}" stroke-width="6"/>`;
    for (let x = cx + 96; x < bridgeTo; x += 20) g += `<path d="M${x} ${base + 40} V${base - 8} a10 10 0 0 1 20 0 V${base + 40}" stroke-width="3.5"/>`;
    g += `</g><g fill="${C.castle}">${tower(cx + 150, base - 20, 34, 8)}${tower(cx + 176, base - 20, 26, 7)}</g>`;
  }
  const wins = [[0, -96, 4, 10], [-17, -74, 3, 7], [17, -74, 3, 7], [-5, -48, 5, 11], [5, -48, 5, 11], [-33, -52, 3, 6],
    [33, -56, 3, 6], [-50, -38, 2.5, 5], [49, -40, 2.5, 5], [0, -22, 4, 7], [-24, -30, 2.5, 5], [25, -28, 2.5, 5], [-64, -24, 2.5, 4]];
  if (bridgeTo) wins.push([150, -24, 2.5, 5]);
  return g + `<g fill="${C.win}">${wins.map(([dx, dy, ww, hh], i) => `<rect class="win" style="animation-delay:${f((i * 0.37) % 2.6)}s" x="${f(cx + dx - ww / 2)}" y="${f(base - 26 + dy)}" width="${ww}" height="${hh}" rx="${ww / 2}"/>`).join('')}</g>`;
}

const clouds = (x0, x1, cy, n, opacity) => {
  let e = '';
  for (let i = 0; i < n; i++) e += `<ellipse cx="${f(r(x0, x1))}" cy="${f(cy + r(-14, 14))}" rx="${f(r(30, 70))}" ry="${f(r(8, 16))}"/>`;
  return `<g class="drift" fill="url(#puffCloud)" opacity="${opacity}">${e}</g>`;
};

const moon = (x, y, rad) => `<circle cx="${x}" cy="${y}" r="${f(rad * 1.45)}" fill="url(#halo)"/><circle cx="${x}" cy="${y}" r="${rad}" fill="${C.moon}"/>
<g fill="url(#puffLit)" opacity=".35"><ellipse cx="${f(x - rad * 0.3)}" cy="${f(y - rad * 0.25)}" rx="${f(rad * 0.27)}" ry="${f(rad * 0.15)}"/><ellipse cx="${f(x + rad * 0.33)}" cy="${f(y + rad * 0.24)}" rx="${f(rad * 0.33)}" ry="${f(rad * 0.18)}"/></g>`;

// A glide across a span, as an inline animateTransform so each raven can have its own path.
const ravenFlight = (fromX, toX, y, size, dur, letter = false) => `<g fill="${C.ink}">
<animateTransform attributeName="transform" type="translate" from="${fromX} ${y}" to="${toX} ${y - 30}" dur="${dur}s" repeatCount="indefinite"/>
<use href="#raven" width="${size}" height="${size / 2}"/>${letter ? `<g class="sway"><path d="M${f(size * 0.5)} ${f(size * 0.34)} v${f(size * 0.14)}" stroke="${C.ink}" stroke-width="1"/><rect x="${f(size * 0.38)}" y="${f(size * 0.48)}" width="${f(size * 0.26)}" height="${f(size * 0.18)}" fill="${C.vellum}" stroke="${C.ink}" stroke-width=".8"/><circle cx="${f(size * 0.51)}" cy="${f(size * 0.57)}" r="${f(size * 0.045)}" fill="${C.crimson}"/></g>` : ''}</g>`;

const petals = (w, n) => `<g fill="${C.crimson}">${Array.from({ length: n }, (_, i) => `<path class="petal" style="animation-delay:${f(i * 1.6)}s" d="M${f(r(60, w - 30))} -10 q7 -5 11 2 q-5 7 -11 -2Z"/>`).join('')}</g>`;

const write = (name, content) => {
  fs.writeFileSync(path.join(OUT, name), content);
  console.log(`docs/readme/${name}  ${(content.length / 1024).toFixed(1)} KB`);
};

// ---------- banner ----------
{
  seed = 7;
  const X0 = 730, X1 = 1110, Y0 = 26, Y1 = 372, CX = (X0 + X1) / 2, W = X1 - X0;
  const d = archPath(X0, X1, Y0, Y1, 150);
  const scene = `<rect x="${X0 - 10}" y="${Y0 - 10}" width="${W + 20}" height="${Y1 - Y0 + 20}" fill="url(#sky)"/>
  ${stars(X0, X1, Y0 + 10, 160, 26)}
  ${moon(CX + 4, 112, 66)}
  ${clouds(X0, X1, 110, 7, 0.85)}${clouds(X0, X1, 160, 6, 0.7)}
  <path d="${ridge(X0, X1, 222, 64, 24, 10, Y1 + 10)}" fill="${C.far}"/>
  <ellipse class="drift" cx="${CX}" cy="248" rx="${W * 0.7}" ry="16" fill="url(#puffMist)" opacity=".16"/>
  <path d="${ridge(X0, X1, 262, 42, 18, 8, Y1 + 10)}" fill="${C.mid}"/>
  <path d="M${X0 - 10} ${Y1} L${X0 - 10} 304 Q${CX - 150} 292 ${CX - 118} 258 Q${CX - 104} 242 ${CX - 96} 238 L${CX + 92} 238 Q${CX + 112} 240 ${CX + 128} 262 Q${CX + 150} 268 ${X1 + 10} 266 L${X1 + 10} ${Y1}Z" fill="${C.rock}"/>
  <g stroke="${C.mid}" stroke-width="1" opacity=".6" fill="none"><path d="M${CX - 110} 276 q22 -10 44 -6 M${CX + 10} 256 q30 4 56 16 M${CX - 40} 296 q25 -8 55 -2 M${CX + 140} 280 q20 -4 40 0"/></g>
  ${castle(CX - 6, 236, X1 + 10)}
  <ellipse class="drift" cx="${CX}" cy="304" rx="${W * 0.75}" ry="20" fill="url(#puffMist)" opacity=".22"/>
  ${pines(X0, X1, 316, 16, 30, C.near, Y1 + 10)}${pines(X0, X1, 352, 22, 40, C.forest, Y1 + 10)}
  <ellipse cx="${CX}" cy="360" rx="${W * 0.8}" ry="26" fill="url(#puffMist)" opacity=".2"/>
  ${ravenFlight(X0 - 40, X1 + 40, 70, 26, 16)}`;
  const body = page(1200, 400, `
  <rect x="70" y="70" width="150" height="150" fill="${C.crimson}"/>
  <rect x="78" y="78" width="134" height="134" fill="none" stroke="${C.vellum}" stroke-width="2"/>
  <text x="145" y="192" text-anchor="middle" font-family="${SERIF}" font-size="150" fill="${C.vellum}">M</text>
  <g fill="${C.vellum}" opacity=".85"><circle cx="88" cy="88" r="3"/><circle cx="202" cy="88" r="3"/><circle cx="88" cy="202" r="3"/><circle cx="202" cy="202" r="3"/></g>
  <text x="245" y="140" font-family="${SERIF}" font-size="62" fill="${C.ink}">iguel Fernández</text>
  <text x="248" y="182" font-family="${CAPS}" font-size="22" letter-spacing="4" fill="${C.crimson}">here beginneth the chronicle</text>
  <path d="M245 205 H690" stroke="${C.ink}" stroke-width="1"/>
  <text x="72" y="298" font-family="${SERIF}" font-style="italic" font-size="25" fill="${C.brown}">A portfolio you step into, painted like an animated film:</text>
  <text x="72" y="330" font-family="${SERIF}" font-style="italic" font-size="25" fill="${C.brown}">a castle, a library, a quest board and a raven.</text>
  ${archFrame(d, 'win', scene)}
  <path d="M${X0 + 12} ${Y1} V152 Q${X0 + 12} ${Y0 + 12} ${CX} ${Y0 + 6} Q${X1 - 12} ${Y0 + 12} ${X1 - 12} 152 V${Y1}" fill="none" stroke="${C.ink}" stroke-width="2" opacity=".7"/>
  <use href="#rose" x="${X0 - 34}" y="314" width="66" height="66"/><use href="#rose" x="${X1 - 32}" y="314" width="66" height="66"/>
  ${petals(1200, 6)}`);
  write('banner.svg', svg(1200, 400, 'Miguel Fernández: an illuminated manuscript page with a gothic window showing the castle under the full moon', '', body, ['display', 'italic', 'caps']));
}

// ---------- divider ----------
{
  seed = 21;
  const body = `<g stroke="${C.crimson}" stroke-width="1.2" opacity=".85"><path d="M140 20 H545 M655 20 H1060"/></g>
  <g fill="#8a8780"><circle cx="140" cy="20" r="2.5"/><circle cx="1060" cy="20" r="2.5"/><circle cx="520" cy="20" r="1.8"/><circle cx="680" cy="20" r="1.8"/></g>
  <use href="#rose" x="548" y="4" width="30" height="30"/><use href="#rose" x="622" y="4" width="30" height="30"/>
  <path d="M600 6 L612 20 L600 34 L588 20Z" fill="${C.crimson}"/><path d="M600 12 L606 20 L600 28 L594 20Z" fill="${C.vellum}" opacity=".8"/>`;
  write('divider.svg', svg(1200, 40, 'Divider', '', body));
}

// ---------- the journey: five windows, one per scene ----------
{
  seed = 33;
  const W = 1200, H = 330, ww = 172, gap = (W - 80 - ww * 5) / 4, top = 46, bottom = 262;
  const scenes = [
    // I · the moon above the clouds
    (x0, x1) => `<rect x="${x0}" y="${top - 10}" width="${ww}" height="${bottom - top + 20}" fill="url(#sky)"/>${stars(x0, x1, top + 10, 200, 14)}
      ${moon((x0 + x1) / 2, 128, 44)}<g class="drift" fill="url(#puffMist)" opacity=".4"><ellipse cx="${x0 + 40}" cy="210" rx="70" ry="16"/><ellipse cx="${x1 - 30}" cy="232" rx="80" ry="18"/><ellipse cx="${(x0 + x1) / 2}" cy="252" rx="100" ry="20"/></g>`,
    // II · the castle on its hill
    (x0, x1) => { const cx = (x0 + x1) / 2; return `<rect x="${x0}" y="${top - 10}" width="${ww}" height="${bottom - top + 20}" fill="url(#sky)"/>${stars(x0, x1, top + 10, 120, 8)}
      ${moon(cx + 30, 92, 30)}<path d="${ridge(x0, x1, 200, 30, 20, 6, bottom + 10)}" fill="${C.far}"/>
      <g transform="translate(${cx} 200) scale(.52) translate(${-cx} -236)"><path d="M${cx - 150} 340 Q${cx - 120} 256 ${cx - 96} 238 L${cx + 92} 238 Q${cx + 120} 256 ${cx + 150} 340Z" fill="${C.rock}"/>${castle(cx, 236)}</g>
      ${pines(x0, x1, 248, 12, 22, C.forest, bottom + 10)}`; },
    // III · the library: a candle and an open book by a lancet window
    (x0, x1) => { const cx = (x0 + x1) / 2; return `<rect x="${x0}" y="${top - 10}" width="${ww}" height="${bottom - top + 20}" fill="#0b1226"/>
      <path d="M${cx - 26} 150 V96 Q${cx - 26} 70 ${cx} 64 Q${cx + 26} 70 ${cx + 26} 96 V150Z" fill="url(#sky)"/>${moon(cx + 6, 96, 12)}
      <circle cx="${cx - 34}" cy="190" r="70" fill="url(#warm)"/>
      <path d="M${x0} 214 H${x1} V${bottom + 10} H${x0}Z" fill="#160f0c"/>
      <path d="M${cx - 50} 214 Q${cx - 18} 202 ${cx} 210 Q${cx + 18} 202 ${cx + 50} 214 L${cx + 46} 220 Q${cx + 18} 210 ${cx} 218 Q${cx - 18} 210 ${cx - 46} 220Z" fill="${C.vellum}"/>
      <path d="M${cx} 210 V218" stroke="#8a7a66" stroke-width="1"/><g stroke="#8a7a66" stroke-width=".8" opacity=".7"><path d="M${cx - 40} 212 q15 -6 32 -2 M${cx + 8} 210 q15 -4 32 2"/></g>
      <rect x="${cx - 40}" y="172" width="10" height="38" fill="${C.vellum}"/><path d="M${cx - 35} 172 v-6" stroke="${C.ink}" stroke-width="1.5"/>
      <path class="flame" d="M${cx - 35} 154 q6 8 0 14 q-6 -6 0 -14Z" fill="${C.flame}"/>
      <path d="M${cx + 30} 214 L${cx + 52} 168" stroke="${C.vellum}" stroke-width="2"/><path d="M${cx + 52} 168 q10 -16 6 -28 q-12 14 -6 28Z" fill="${C.vellum}"/>`; },
    // IV · the quest board: a parchment pinned with a dagger, by lantern light
    (x0, x1) => { const cx = (x0 + x1) / 2; return `<rect x="${x0}" y="${top - 10}" width="${ww}" height="${bottom - top + 20}" fill="url(#sky)"/>${stars(x0, x1, top + 10, 110, 7)}
      ${pines(x0, x1, 150, 30, 60, C.near, bottom + 10)}<circle cx="${cx - 56}" cy="150" r="56" fill="url(#warm)"/>
      <rect x="${cx - 46}" y="120" width="92" height="120" fill="#2a1c12"/><g stroke="#1a110a" stroke-width="2"><path d="M${cx - 46} 150 H${cx + 46} M${cx - 46} 180 H${cx + 46} M${cx - 46} 210 H${cx + 46}"/></g>
      <path d="M${cx - 54} 120 L${cx} 100 L${cx + 54} 120Z" fill="#14100c"/>
      <path d="M${cx - 24} 140 h48 l-3 66 h-42Z" fill="${C.vellum}"/><g stroke="#8a7a66" stroke-width=".8"><path d="M${cx - 16} 160 h32 M${cx - 16} 170 h28 M${cx - 16} 180 h30"/></g>
      <circle cx="${cx}" cy="196" r="6" fill="${C.crimson}"/><path d="M${cx} 128 V152" stroke="#c9c6bf" stroke-width="3"/><path d="M${cx - 7} 132 h14" stroke="#c9c6bf" stroke-width="3"/>
      <rect x="${cx - 70}" y="136" width="14" height="20" rx="3" fill="#1a110a"/><rect class="win" x="${cx - 67}" y="140" width="8" height="12" fill="${C.flame}"/>`; },
    // V · the raven carrying a sealed letter across the moon
    (x0, x1) => { const cx = (x0 + x1) / 2; return `<rect x="${x0}" y="${top - 10}" width="${ww}" height="${bottom - top + 20}" fill="url(#sky)"/>${stars(x0, x1, top + 10, 200, 14)}
      ${moon(cx + 10, 120, 46)}${clouds(x0, x1, 190, 3, 0.8)}
      <path d="M${x0} 250 Q${cx} 236 ${x1} 252 V${bottom + 10} H${x0}Z" fill="${C.forest}"/>
      ${ravenFlight(x0 - 40, x1 + 10, 150, 46, 9, true)}`; },
  ];
  const labels = ['I · the moon', 'II · the castle', 'III · the chronicle', 'IV · the quest board', 'V · send a raven'];
  let inner = '';
  scenes.forEach((scene, i) => {
    const x0 = 40 + i * (ww + gap), x1 = x0 + ww;
    inner += archFrame(archPath(x0, x1, top, bottom, top + 60), `w${i}`, scene(x0, x1), 3);
    inner += `<text x="${(x0 + x1) / 2}" y="${bottom + 36}" text-anchor="middle" font-family="${CAPS}" font-size="21" letter-spacing="2" fill="${C.ink}">${labels[i]}</text>`;
  });
  write('journey.svg', svg(W, H, 'The five scenes of the site: the moon, the castle, the library, the quest board and the raven', '', page(W, H, inner), ['caps']));
}

// ---------- painted, then brought to life: sketch becomes painting ----------
{
  seed = 51;
  const W = 1200, H = 300, x0 = 420, x1 = 780, top = 40, bottom = 262, cx = (x0 + x1) / 2;
  const d = archPath(x0, x1, top, bottom, top + 70);
  // The same scene twice: traced in pencil on the left half, painted on the right half. Same seed, same drawing.
  const art = (lines) => {
    seed = 51;
    const sky = lines ? '' : `<rect x="${x0}" y="${top - 10}" width="${x1 - x0}" height="${bottom - top + 20}" fill="url(#sky)"/>`;
    const s = stars(x0, x1, top + 10, 140, 12);
    const drawing = `${moon(cx + 10, 112, 50)}<path d="${ridge(x0, x1, 200, 34, 22, 6, bottom + 10)}" fill="${C.far}"/>
    <g transform="translate(${cx} 214) scale(.66) translate(${-cx} -236)">${castle(cx, 236)}</g>${pines(x0, x1, 240, 14, 26, C.forest, bottom + 10)}`;
    return lines ? `<g class="sketch">${drawing}</g>` : `${sky}${s}${drawing}`;
  };
  const scene = `<rect x="${x0}" y="${top - 10}" width="${x1 - x0}" height="${bottom - top + 20}" fill="${C.vellum}"/>
  <clipPath id="left"><rect x="${x0 - 10}" y="0" width="${cx - x0 + 10}" height="${H}"/></clipPath><clipPath id="right"><rect x="${cx}" y="0" width="${x1 - cx + 10}" height="${H}"/></clipPath>
  <g clip-path="url(#left)">${art(true)}</g><g clip-path="url(#right)">${art(false)}</g>
  <path d="M${cx} ${top - 10} V${bottom + 10}" stroke="${C.crimson}" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  const inner = `
  <!-- inkwell and quill -->
  <g transform="translate(200 166) scale(.82)">
    <ellipse cx="0" cy="96" rx="64" ry="10" fill="#000" opacity=".12"/>
    <path d="M-40 92 Q-46 50 -26 36 L-22 20 H22 L26 36 Q46 50 40 92Z" fill="${C.ink}"/><rect x="-26" y="12" width="52" height="10" rx="3" fill="#2a1f18"/>
    <path d="M-26 52 Q0 42 26 52" stroke="#3a3a46" stroke-width="3" fill="none" opacity=".6"/>
    <g class="sway" style="transform-origin:4px 16px"><path d="M4 16 L58 -96" stroke="#2a1f18" stroke-width="2.5"/><path d="M58 -96 Q92 -150 70 -190 Q40 -140 46 -100Z" fill="${C.vellum}" stroke="#8a7a66" stroke-width="1"/><path d="M54 -100 Q66 -140 70 -186" stroke="#8a7a66" stroke-width="1" fill="none"/></g>
  </g>
  <!-- the brush -->
  <g transform="translate(1060 168) rotate(-24) scale(.86)">
    <rect x="-6" y="-120" width="12" height="150" rx="5" fill="#2a1f18"/><rect x="-8" y="26" width="16" height="22" fill="#8a7a66"/>
    <path d="M-8 48 Q-10 80 0 98 Q10 80 8 48Z" fill="${C.crimson}"/>
  </g>
  <circle cx="1112" cy="262" r="5" fill="${C.crimson}" opacity=".7"/><circle cx="1126" cy="254" r="3" fill="${C.crimson}" opacity=".5"/>
  ${archFrame(d, 'canvas', scene)}
  <text x="${x0 - 28}" y="${top + 40}" text-anchor="end" font-family="${CAPS}" font-size="22" letter-spacing="2" fill="${C.brown}">sketched</text>
  <path d="M${x0 - 26} ${top + 48} H${x0 - 120}" stroke="${C.brown}" stroke-width="1"/>
  <text x="${x1 + 28}" y="${top + 40}" font-family="${CAPS}" font-size="22" letter-spacing="2" fill="${C.crimson}">painted &amp; alive</text>
  <path d="M${x1 + 26} ${top + 48} H${x1 + 168}" stroke="${C.crimson}" stroke-width="1"/>`;
  write('craft.svg', svg(W, H, 'A quill and a brush either side of a gothic window: on the left the castle as a pencil sketch, on the right painted and alive', '', page(W, H, inner), ['caps']));
}

// ---------- built with: wax seals ----------
{
  seed = 77;
  const W = 1200, H = 262;
  const tools = [['Three.js', '△'], ['Vite', 'V'], ['JavaScript', 'JS'], ['CSS', '{ }'], ['Vitest', '✓'], ['Cloudflare', '☁']];
  const step = (W - 160) / tools.length;
  let inner = '';
  tools.forEach(([name, mark], i) => {
    const x = 80 + step * (i + 0.5), y = 100;
    let blob = '';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
      const rr = 46 + r(-4, 5);
      blob += `${blob ? 'L' : 'M'}${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`;
    }
    inner += `<g>
      <path d="M${x - 14} ${y + 30} L${x - 26} ${y + 84} L${x - 14} ${y + 76} L${x - 6} ${y + 88} L${x - 2} ${y + 36}Z" fill="${C.crimsonDeep}"/>
      <path d="M${x + 14} ${y + 30} L${x + 26} ${y + 84} L${x + 14} ${y + 76} L${x + 6} ${y + 88} L${x + 2} ${y + 36}Z" fill="${C.crimson}"/>
      <path d="${blob}Z" fill="${C.crimson}" stroke="${C.crimsonDeep}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="${x}" cy="${y}" r="32" fill="none" stroke="${C.crimsonDeep}" stroke-width="2"/>
      <circle cx="${x}" cy="${y}" r="27" fill="none" stroke="#e8213f" stroke-width="1" opacity=".6"/>
      <text x="${x}" y="${y + 9}" text-anchor="middle" font-family="${CAPS}" font-size="26" fill="${C.vellum}" opacity=".95">${mark}</text>
      <path d="M${x - 22} ${y - 28} Q${x - 30} ${y - 10} ${x - 24} ${y + 4}" stroke="#ff8a9a" stroke-width="2" fill="none" opacity=".35"/>
      <text x="${x}" y="${y + 124}" text-anchor="middle" font-family="${CAPS}" font-size="21" letter-spacing="1.5" fill="${C.ink}">${name}</text>
    </g>`;
  });
  write('seals.svg', svg(W, H, 'Built with Three.js, Vite, JavaScript, CSS, Vitest and Cloudflare Pages, shown as crimson wax seals', '', page(W, H, inner), ['caps']));
}

// ---------- colophon: the raven flies off with the letter ----------
{
  seed = 91;
  const W = 1200, H = 210, x0 = 60, x1 = 1140, top = 34, bottom = 176;
  const d = `M${x0} ${bottom} V${top + 20} Q${x0} ${top} ${x0 + 20} ${top} H${x1 - 20} Q${x1} ${top} ${x1} ${top + 20} V${bottom}Z`;
  const scene = `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${bottom - top}" fill="url(#sky)"/>${stars(x0, x1, top + 6, bottom - 40, 30)}
  ${moon(860, 100, 44)}${clouds(x0, x1, 140, 6, 0.8)}
  <path d="${ridge(x0, x1, 160, 18, 26, 4, bottom + 10)}" fill="${C.far}"/>${pines(x0, x1, 170, 10, 20, C.forest, bottom + 10)}
  ${ravenFlight(x0 - 60, x1 + 20, 84, 52, 14, true)}`;
  const inner = `${archFrame(d, 'night', scene, 3)}
  <text x="120" y="108" font-family="${CAPS}" font-size="26" letter-spacing="4" fill="${C.vellum}">here endeth the chronicle</text>
  <text x="122" y="140" font-family="${SERIF}" font-style="italic" font-size="20" fill="#c9c6bf">© MMXXVI Miguel Fernández · all rights reserved</text>
  <use href="#rose" x="${x0 - 30}" y="${bottom - 40}" width="56" height="56"/><use href="#rose" x="${x1 - 26}" y="${bottom - 40}" width="56" height="56"/>`;
  write('colophon.svg', svg(W, H, 'Here endeth the chronicle: a raven carries a sealed letter across the moon. © 2026 Miguel Fernández, all rights reserved', '', page(W, H, inner), ['italic', 'caps']));
}
