import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('/@mantine/')) {
            return 'vendor-mantine';
          }

          if (id.includes('/@tanstack/')) {
            return 'vendor-query';
          }

          if (id.includes('/@tabler/icons-react/')) {
            return 'vendor-icons';
          }

          return 'vendor';
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.agents/**',
      ],
    },
  },
});
