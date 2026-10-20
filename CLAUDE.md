# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Miguel Fernández's personal portfolio: a single static page (Vite + vanilla JS, no framework) over a full-screen Three.js scene. Scrolling flies the camera from a moon above a sea of volumetric clouds, down through them, to a procedural Mont-Saint-Michel on a reflective bay. Deployed to Cloudflare Pages from the `main` branch (build `npm run build`, output `dist/`). The repo is public but the content is **all rights reserved** (`LICENSE`).

## Commands

```bash
npm run dev       # dev server (http://localhost:5173)
npm run build     # production build into dist/
npm run preview   # serve dist/ with the same security headers as production
npm run notices   # regenerate public/third-party-notices.txt after changing dependencies
```

There are no tests or linters. Verify changes by building, running `npm run preview`, and checking the page in a browser (screenshots at desktop and ~390px phone width, plus the console). `npx vite preview --host 0.0.0.0` exposes it on the LAN for phone testing.

## Hard constraints

- **Strict CSP** (`public/_headers`, also applied by `vite preview` via `vite.config.js`): `'self'` only. No inline `<script>`, inline event handlers, or `style="..."` attributes (set styles via CSSOM, e.g. `el.style.setProperty`, which is allowed). No third-party origins: no CDNs, Google Fonts, analytics or embeds. The privacy dialog promises zero third-party requests and no cookies, so keep it that way.
- **Fonts are self-hosted** through `@fontsource` imports at the top of `src/main.js` (Latin subsets only). Add weights there, not via `<link>`.
- **Bilingual copy:** every visible string is a key in `src/i18n.js` with both `en` and `es` entries. Elements use `data-i18n` (text) or `data-i18n-aria` (aria-label). Changing text can change section heights, which moves camera stops (`world.remeasure()` is called on language change).
- **Accessibility:** small crimson text uses `--crimson-text` (AA contrast), not `--crimson`. Respect `prefers-reduced-motion` (the scene renders a single still frame of the mount) and the *Pause motion* toggle (`world.setMotion`).
- Dependency versions are pinned exactly. After adding or upgrading a dependency, run `npm run notices`.

## Architecture

### Page layer
- `src/config.js`: name, social links, and the `projects` list. Each project renders as a heraldic shield in the Armory section (`status: 'incoming' | 'ready'`, `division` picks the shield's field division).
- `src/main.js`: renders the projects, scroll reveals, the language and motion toggles, the privacy `<dialog>`, and the **cinematic glide** for in-page `#` links (a scripted slow scroll; CSS `scroll-behavior: smooth` is intentionally off). It lazy-imports `src/scene/world.js` so text paints first.
- The 3D canvas lives in a fixed `.scene` element behind all content. Sections are transparent overlays with their own readable backdrops.

### Camera is driven by page sections
`world.js` has `CAM_STOPS`, one camera position/target per element with a `data-cam` attribute, in DOM order (hero, descent, about, projects, contact). A stop is reached when its section is centred in the viewport. The last stop maps to the bottom of the page. Adding, removing or reordering `data-cam` sections requires matching changes to `CAM_STOPS`. On phones the frame is shifted with `camera.setViewOffset` instead of moving the camera, and the camera's `y` is clamped above the water (`MIN_CAM_Y`).

### Scene modules (`src/scene/`)
- `world.js` orchestrates everything: renderer, quality tier (`mobile` vs desktop object `q`: texture sizes, cloud steps, shadows, pixel ratio), lights, water, moon, post-processing, camera path, render loop.
- `gen.js` holds **pure** texture generators (no Three.js, no DOM) that return raw RGBA bytes. They run in parallel Web Workers (`gen.worker.js`) via `createGenerator()` in `textures.js`, which falls back to the main thread when workers or OffscreenCanvas are unavailable. Keep `gen.js` free of DOM and Three.js imports so it stays worker-safe.
- `textures.js` wraps raw bytes into GPU textures and holds the cheap canvas textures (banners, rose window, gate glow, sky, streaks).
- **Placeholder-swap pattern:** materials are created with 1×1 placeholder `map`/`normalMap` textures so every shader compiles once up front (`renderer.compileAsync` for the scene, plus a stand-in scene for post-processing materials). Generated maps are swapped in when the workers finish, with no recompile. Preserve this when adding materials: give them placeholders from the start, or they will compile synchronously and hitch.
- The scene fades in (`.scene.is-ready`) once shaders are compiled and the hero's moon and cloud volume have arrived. Castle textures can land later.
- `clouds.js` `CloudPass` is the first post-processing pass and **renders the scene itself** into a target with a depth texture, raymarches the volumetric cloud deck at reduced resolution against that depth, then composites. Bloom and `OutputPass` (tone mapping) follow. The cloud density, a clearing over the mount that opens as the camera descends, and in-cloud dimming are all in the march shader and its uniforms.
- `mount.js` builds Mont-Saint-Michel (rock lathe, ramparts, the gatehouse at `GATE_ANGLE`, the village as instanced houses, abbey, spire, banners, smoke). `terrain.js` builds the tidal flats (`bayHeight`), boulders, the causeway (aligned to `GATE_ANGLE`/`GATE_DEPTH`), and the horizon ring.
- `sky.js` puts stars, the Milky Way, shooting stars and petals on `SKY_LAYER` (layer 1). The main camera enables that layer, but the `Water` reflection camera only sees layer 0, which keeps stars from reflecting as grey specks. Put new sky-only effects on this layer.
- Randomness comes from a seeded `mulberry32`, so the scene is identical on every visit.
- The shadow map renders once (`shadowMap.autoUpdate = false`) because the geometry is static. Don't defer it past the first frame, or shadow-receiving materials fail to draw.
- `renderer.debug.checkShaderErrors` is enabled only in dev (`import.meta.env.DEV`). Turn it on when debugging shaders in a production build.
