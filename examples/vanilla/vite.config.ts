import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Lets `npx vite examples/vanilla` run the example against the SDK sources.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@restorino/sdk': fileURLToPath(new URL('../../src/index.ts', import.meta.url))
    }
  }
});
