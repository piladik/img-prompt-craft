import { describe, it, expect } from 'vitest';
import { loadStorageConfig } from '../../src/storage/index.js';

describe('loadStorageConfig', () => {
  it('returns disabled when PROMPT_STORAGE_ENABLED is not set', () => {
    const result = loadStorageConfig({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('disabled');
  });

  it('returns disabled when PROMPT_STORAGE_ENABLED is not "1"', () => {
    const result = loadStorageConfig({ PROMPT_STORAGE_ENABLED: 'false' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('disabled');
  });

  it('returns invalid when DATABASE_URL is missing', () => {
    const result = loadStorageConfig({ PROMPT_STORAGE_ENABLED: '1' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('invalid');
  });

  it('returns invalid when DATABASE_URL is not a postgres URL', () => {
    const result = loadStorageConfig({
      PROMPT_STORAGE_ENABLED: '1',
      DATABASE_URL: 'mysql://localhost/db',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('invalid');
    expect(result.error).toContain('DATABASE_URL');
  });

  it('returns config for a valid postgresql:// URL', () => {
    const result = loadStorageConfig({
      PROMPT_STORAGE_ENABLED: '1',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/mydb',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.databaseUrl).toBe('postgresql://user:pass@localhost:5432/mydb');
    expect(result.config.connectTimeoutMs).toBe(5_000);
  });

  it('returns config for a valid postgres:// URL', () => {
    const result = loadStorageConfig({
      PROMPT_STORAGE_ENABLED: '1',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/mydb',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.databaseUrl).toBe('postgres://user:pass@localhost:5432/mydb');
  });

  it('uses custom connect timeout when valid', () => {
    const result = loadStorageConfig({
      PROMPT_STORAGE_ENABLED: '1',
      DATABASE_URL: 'postgresql://localhost/db',
      POSTGRES_CONNECT_TIMEOUT_MS: '10000',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.connectTimeoutMs).toBe(10_000);
  });

  it('falls back to default timeout for invalid value', () => {
    const result = loadStorageConfig({
      PROMPT_STORAGE_ENABLED: '1',
      DATABASE_URL: 'postgresql://localhost/db',
      POSTGRES_CONNECT_TIMEOUT_MS: 'not-a-number',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.connectTimeoutMs).toBe(5_000);
  });

  it('falls back to default timeout for negative value', () => {
    const result = loadStorageConfig({
      PROMPT_STORAGE_ENABLED: '1',
      DATABASE_URL: 'postgresql://localhost/db',
      POSTGRES_CONNECT_TIMEOUT_MS: '-500',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.connectTimeoutMs).toBe(5_000);
  });

  it('floors fractional timeout to integer', () => {
    const result = loadStorageConfig({
      PROMPT_STORAGE_ENABLED: '1',
      DATABASE_URL: 'postgresql://localhost/db',
      POSTGRES_CONNECT_TIMEOUT_MS: '3500.9',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.connectTimeoutMs).toBe(3_500);
  });
});
