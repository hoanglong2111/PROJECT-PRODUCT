import pg from 'pg';

import { DATABASE_URL } from './constants';

const { Pool } = pg;

const requiresSsl =
  process.env.DATABASE_SSL === 'true' ||
  process.env.RENDER === 'true' ||
  process.env.DATABASE_URL?.includes('render.com') ||
  process.env.DATABASE_URL?.includes('railway.app');

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});
