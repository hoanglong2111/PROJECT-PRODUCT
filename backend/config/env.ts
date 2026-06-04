import './load-env';

export const env = {
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:4000/api',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  databaseUrl:
    process.env.DATABASE_URL ??
    (() => {
      if (process.env.RENDER === 'true' || process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is required in production. Set it in the hosting service environment variables.');
      }

      return 'postgresql://postgres:postgres@localhost:5432/kbfe';
    })(),
  jwtSecret: process.env.JWT_SECRET ?? 'kbfe-dev-secret',
  port: Number(process.env.PORT ?? process.env.BE_PORT ?? 4000),
  render: process.env.RENDER === 'true',
} as const;
