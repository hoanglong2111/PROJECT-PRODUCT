import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const packageJsonUrl = [new URL('../package.json', import.meta.url), new URL('../../package.json', import.meta.url)].find(
  (candidate) => existsSync(candidate),
);

if (!packageJsonUrl) {
  throw new Error('Unable to locate backend package.json.');
}

config({
  path: fileURLToPath(new URL('.env', packageJsonUrl)),
  quiet: true,
});
