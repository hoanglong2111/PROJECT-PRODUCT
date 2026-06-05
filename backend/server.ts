import './config/load-env';

import { createApp } from './app';
import { API_PREFIX, PORT } from './domain/constants';
import { ensureSchemaAndSeed } from './models/schema';
import { startOutboxWorker } from './services/gd1-outbox-worker.service';

export async function startServer() {
  await ensureSchemaAndSeed();
  await startOutboxWorker();
  const app = createApp();

  return app.listen(PORT, () => {
    console.log(`KBFE backend is running at http://localhost:${PORT}${API_PREFIX}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Failed to start KBFE backend:', error);
  process.exit(1);
});
