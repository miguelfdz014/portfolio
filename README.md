# Miguel Fernández — Portfolio

A moonlit, medieval-inspired portfolio: a castle on a cliff, drifting fog, twinkling stars and falling rose petals. Built with [Vite](https://vite.dev) and plain JavaScript/CSS, with an EN/ES language toggle.

## Run locally

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the built site
```

## Editing content

- **Name, links, projects:** `src/config.js`. Each project is a heraldic shield in the Armory. To publish one, change its `status` to `'ready'` and add `title`, `description`, `tags` and `url` (see the commented example in the file).
- **Text in both languages:** `src/i18n.js`.
- **Colors and fonts:** the variables at the top of `src/styles/main.css`.
- **3D scene:** `src/scene/` — `world.js` (camera path, lights, water, moon), `mount.js` (Mont-Saint-Michel), `terrain.js` (bay, causeway, coast), `clouds.js` (volumetric clouds), `textures.js` (generated textures).

## Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick the `portfolio` repository.
4. Build settings:
   - Framework preset: **Vite** (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Click **Save and Deploy**. The site goes live at `https://<project>.pages.dev`.

After that, every push to `main` redeploys automatically. To use your own domain, open the project → **Custom domains**.

## Security, privacy and accessibility

- **No third-party requests.** Fonts are self-hosted (`@fontsource`), there are no analytics, cookies or trackers.
- **Security headers** live in `public/_headers` (strict Content-Security-Policy, HSTS, no framing). `npm run preview` applies the same headers locally.
- **Cloudflare settings:** keep features that inject scripts *off* (Web Analytics auto-injection, Rocket Loader, Email Obfuscation, Zaraz) — the CSP would block them, and they would also change the privacy notice.
- **Accessibility:** WCAG AA contrast, keyboard focus styles, skip link, `prefers-reduced-motion` support and a *Pause motion* button.
- **Licences:** the site is © Miguel Fernández, all rights reserved (see `LICENSE`). Bundled third-party licences are in `public/third-party-notices.txt`; regenerate with `npm run notices` after changing dependencies.

