import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __CARD_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  build: {
    // HACS serves exactly one file (hacs.json `filename`): everything, Lit
    // included, has to land in a single self-contained ES module.
    lib: {
      entry: 'src/renault-r5-card.ts',
      formats: ['es'],
      fileName: () => 'renault-r5-card.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
  },
})
