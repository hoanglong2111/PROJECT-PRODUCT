import cors from 'cors';

import { CORS_ORIGINS, normalizeOrigin } from '../domain/constants';

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || CORS_ORIGINS.includes(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin is not allowed: ${origin}`));
  },
});
