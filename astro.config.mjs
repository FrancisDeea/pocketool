// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',

  integrations: [react()],

  server: {
    host: true,
    port: 4321,
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
    build: {
      chunkSizeWarningLimit: 3200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('mermaid')) return 'mermaid';
              if (id.includes('konva')) return 'konva';
              if (id.includes('codemirror') || id.includes('@codemirror')) return 'codemirror';
            }
          },
        },
      },
    },
  },

  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
