import { createApp } from './app';
import { env, usingInMemoryStore } from './config/env';
import { connectDatabase, disconnectDatabase } from './db/connect';
import { loadContent } from './services/contentStore';
import { validateSeedData } from './data/validate';

async function main(): Promise<void> {
  // Catch broken slug references before the server accepts traffic, so a typo
  // in seed.data.ts surfaces as a clear boot message rather than an empty page.
  const problems = validateSeedData();
  if (problems.length > 0) {
    console.warn('[content] Problems found in src/data/seed.data.ts:');
    for (const problem of problems) console.warn(`  - ${problem}`);
  }

  await connectDatabase();
  await loadContent();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log('');
    console.log(`  MDCAS API ready`);
    console.log(`  http://localhost:${env.port}`);
    console.log(`  storage: ${usingInMemoryStore ? 'in-memory seed file' : 'mongodb'}`);
    console.log('');
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[server] ${signal} received, shutting down`);
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[server] failed to start:', error);
  process.exit(1);
});
