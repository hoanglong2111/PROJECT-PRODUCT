import pg from 'pg';

import { env } from './env';

const { Pool } = pg;
const requiresSsl =
  env.databaseSsl ||
  env.render ||
  env.databaseUrl.includes('render.com') ||
  env.databaseUrl.includes('railway.app') ||
  env.databaseUrl.includes('sslmode=require');

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});
