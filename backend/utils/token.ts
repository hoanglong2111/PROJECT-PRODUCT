import jwt from 'jsonwebtoken';

import { APP_ROLES } from '../domain/auth';
import { JWT_SECRET } from '../domain/constants';
import type { TokenPayload } from '../domain/types';

export function createAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded || typeof decoded !== 'object' || !APP_ROLES.includes((decoded as TokenPayload).role)) {
    return null;
  }

  return decoded as TokenPayload;
}
