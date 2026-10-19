import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // The Three.js scene is lazy-loaded after the page text, so a large chunk is expected.
    chunkSizeWarningLimit: 700,
  },
});
