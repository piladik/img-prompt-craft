import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { modelConfigSchema, type ModelConfig } from './model-config-schema.js';

export interface LoadSuccess {
  success: true;
  config: ModelConfig;
}

export interface LoadError {
  success: false;
  error: string;
}

export async function loadModelConfig(
  modelId: string,
  modelsDir: string,
): Promise<LoadSuccess | LoadError> {
  const configPath = join(modelsDir, modelId, 'config.json');

  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch {
    return {
      success: false,
      error: `Model config not found: ${configPath}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      success: false,
      error: `Invalid JSON in model config: ${configPath}`,
    };
  }

  const result = modelConfigSchema.safeParse(parsed);

  if (result.success) {
    return { success: true, config: result.data };
  }

  const issues = result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');

  return {
    success: false,
    error: `Model config validation failed for "${modelId}": ${issues}`,
  };
}
