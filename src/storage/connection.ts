import pg from 'pg';
import type { StorageConfig } from './types.js';

export function createClient(config: StorageConfig): pg.Client {
  return new pg.Client({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: config.connectTimeoutMs,
  });
}
