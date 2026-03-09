import type { LlmConfig } from './types.js';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-5.4';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_PROMPT_LENGTH = 500;

export interface LlmConfigResult {
  success: true;
  config: LlmConfig;
}

export interface LlmConfigError {
  success: false;
  error: string;
}

export type LoadLlmConfigResult = LlmConfigResult | LlmConfigError;

export function loadLlmConfig(
  env: Record<string, string | undefined> = process.env,
): LoadLlmConfigResult {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      error:
        'LLM mode requires OPENROUTER_API_KEY. Get one at https://openrouter.ai/keys or use deterministic mode.',
    };
  }

  const model = env.LLM_MODEL?.trim() || DEFAULT_MODEL;
  const baseUrl = DEFAULT_BASE_URL;

  const rawTimeout = env.LLM_TIMEOUT_MS?.trim();
  const timeoutMs = rawTimeout ? parsePositiveInt(rawTimeout, DEFAULT_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;

  const rawMaxLength = env.LLM_MAX_PROMPT_LENGTH?.trim();
  const maxPromptLength = rawMaxLength
    ? parsePositiveInt(rawMaxLength, DEFAULT_MAX_PROMPT_LENGTH)
    : DEFAULT_MAX_PROMPT_LENGTH;

  return {
    success: true,
    config: { apiKey, model, baseUrl, timeoutMs, maxPromptLength },
  };
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
