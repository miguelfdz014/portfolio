import { defineConfig } from 'vitest/config';

// Node by default; DOM tests opt in with `// @vitest-environment jsdom`.
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.js'] } });
