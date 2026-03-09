#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadStorageConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function ensureMigrationsTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
  const result = await client.query<{ name: string }>('SELECT name FROM _migrations ORDER BY id');
  return new Set(result.rows.map((row) => row.name));
}

async function getMigrationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries.filter((f) => f.endsWith('.sql')).sort();
}

async function runMigrations(): Promise<void> {
  const configResult = loadStorageConfig();

  if (!configResult.success) {
    const message =
      configResult.reason === 'disabled'
        ? 'Storage is not enabled. Set PROMPT_STORAGE_ENABLED=1 and DATABASE_URL in your .env file.'
        : configResult.error;
    console.error(message);
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: configResult.config.databaseUrl,
    connectionTimeoutMillis: configResult.config.connectTimeoutMs,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');

    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = await getMigrationFiles(MIGRATIONS_DIR);
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s).`);

    for (const file of pending) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`  Applying ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  Applied ${file}.`);
      } catch (err) {
        await client.query('ROLLBACK');
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  Failed to apply ${file}: ${message}`);
        process.exit(1);
      }
    }

    console.log('All migrations applied successfully.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Migration error: ${message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
