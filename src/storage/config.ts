import { z } from 'zod';
import type { StorageConfig } from './types.js';

const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;

const storageEnvSchema = z.object({
  PROMPT_STORAGE_ENABLED: z.literal('1'),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a valid PostgreSQL connection string'),
  POSTGRES_CONNECT_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return DEFAULT_CONNECT_TIMEOUT_MS;
      const parsed = Number(val);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_CONNECT_TIMEOUT_MS;
    }),
});

export interface StorageConfigResult {
  success: true;
  config: StorageConfig;
}

export interface StorageConfigDisabled {
  success: false;
  reason: 'disabled';
}

export interface StorageConfigError {
  success: false;
  reason: 'invalid';
  error: string;
}

export type LoadStorageConfigResult = StorageConfigResult | StorageConfigDisabled | StorageConfigError;

export function loadStorageConfig(
  env: Record<string, string | undefined> = process.env,
): LoadStorageConfigResult {
  if (env.PROMPT_STORAGE_ENABLED !== '1') {
    return { success: false, reason: 'disabled' };
  }

  const result = storageEnvSchema.safeParse(env);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return {
      success: false,
      reason: 'invalid',
      error: `Invalid storage configuration:\n  ${messages.join('\n  ')}`,
    };
  }

  return {
    success: true,
    config: {
      databaseUrl: result.data.DATABASE_URL,
      connectTimeoutMs: result.data.POSTGRES_CONNECT_TIMEOUT_MS,
    },
  };
}
