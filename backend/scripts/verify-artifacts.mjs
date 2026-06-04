import { access, readdir } from 'node:fs/promises';

const requiredFiles = [
  new URL('../dist/server.js', import.meta.url),
  new URL('../dist/scripts/seed-normalized-logistics.js', import.meta.url),
  new URL('../dist/mcp/deployServer.js', import.meta.url),
];

for (const file of requiredFiles) {
  await access(file);
}

const sourceMigrations = (await readdir(new URL('../migrations/', import.meta.url))).filter((file) => file.endsWith('.sql')).sort();
const builtMigrations = (await readdir(new URL('../dist/migrations/', import.meta.url))).filter((file) => file.endsWith('.sql')).sort();

if (JSON.stringify(sourceMigrations) !== JSON.stringify(builtMigrations)) {
  throw new Error(`Built migrations do not match source migrations: ${builtMigrations.join(', ')}`);
}

console.log(`Verified ${requiredFiles.length} entrypoints and ${builtMigrations.length} migrations.`);
