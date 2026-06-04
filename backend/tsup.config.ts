import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'server.ts',
    'scripts/seed-normalized-logistics': 'scripts/seed-normalized-logistics.ts',
    'mcp/deployServer': 'mcp/deployServer.ts',
  },
  clean: true,
  dts: false,
  format: ['esm'],
  platform: 'node',
  sourcemap: true,
  splitting: false,
  target: 'node20',
});
