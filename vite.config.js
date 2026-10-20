import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Reads the "/*" block of public/_headers so `npm run preview` enforces the same
// security headers Cloudflare Pages will serve in production.
function siteHeaders() {
  const headers = {};
  let inBlock = false;
  for (const line of readFileSync(new URL('./public/_headers', import.meta.url), 'utf8').split(/\r?\n/)) {
    if (/^\S/.test(line) && !line.startsWith('#')) inBlock = line.trim() === '/*';
    else if (inBlock && line.trim() && !line.trim().startsWith('#')) {
      const i = line.indexOf(':');
      headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  // The local preview is plain HTTP (e.g. testing from a phone on the LAN), so don't force HTTPS there.
  headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests/, '');
  delete headers['Strict-Transport-Security'];
  return headers;
}

export default defineConfig({
  build: {
    // The Three.js scene is lazy-loaded after the page text, so a large chunk is expected.
    chunkSizeWarningLimit: 700,
  },
  preview: {
    headers: siteHeaders(),
  },
});
