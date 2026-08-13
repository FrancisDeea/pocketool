import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@ui': resolve(import.meta.dirname, './src/components/ui'),
      '@tools': resolve(import.meta.dirname, './src/tools'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
