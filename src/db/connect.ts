import mongoose from 'mongoose';

import { env } from '../config/env';

let connected = false;

/**
 * Connects to MongoDB when `MONGO_URI` is configured.
 *
 * When it is not, the API runs entirely from `src/data/seed.data.ts` — a
 * zero-setup mode for local development and demos. Reads work normally;
 * appointment writes go to an in-memory store and are lost on restart. The
 * mode is refused outright in production (see `config/env.ts`).
 */
export async function connectDatabase(): Promise<boolean> {
  if (!env.mongoUri) {
    console.warn(
      '[db] MONGO_URI is not set — running from src/data/seed.data.ts.\n' +
        '     Reads work as normal. Appointment changes are kept in memory and\n' +
        '     will be lost when the server restarts.',
    );
    return false;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  connected = true;
  console.log('[db] MongoDB connected');

  mongoose.connection.on('disconnected', () => {
    connected = false;
    console.warn('[db] MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    connected = true;
    console.log('[db] MongoDB reconnected');
  });

  return true;
}

export function isDatabaseConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  connected = false;
}
