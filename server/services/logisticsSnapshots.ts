import { pool } from '../db';
import { readNormalizedSnapshot, writeNormalizedSnapshot } from './normalizedStore';
import type { DatabaseClient } from '../types';

export async function readSnapshot<T>(key: string, client: DatabaseClient = pool): Promise<T> {
  return readNormalizedSnapshot<T>(key, client);
}

export async function writeSnapshot<T>(key: string, payload: T, client: DatabaseClient = pool) {
  await writeNormalizedSnapshot(key, payload, client);
}
