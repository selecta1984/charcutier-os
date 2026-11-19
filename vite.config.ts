import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build` → hosted PWA in dist/ ; `vite build --mode single` → one self-contained HTML in dist-single/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    ...(mode === 'single'
      ? [
          viteSingleFile(),
          { name: 'strip-pwa-links', transformIndexHtml: (html: string) => html.replace(/\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>/g, '') },
        ]
      : []),
  ],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', copyPublicDir: mode !== 'single' },
  test: { environment: 'node' },
}));
