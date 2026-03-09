import { describe, it, expect } from 'vitest';
import { loadLlmConfig } from '../../src/llm/index.js';

describe('loadLlmConfig', () => {
  it('returns a valid config when OPENROUTER_API_KEY is set', () => {
    const result = loadLlmConfig({ OPENROUTER_API_KEY: 'sk-test-key-123' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.apiKey).toBe('sk-test-key-123');
    expect(result.config.model).toBe('openai/gpt-5.4');
    expect(result.config.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(result.config.timeoutMs).toBe(15_000);
    expect(result.config.maxPromptLength).toBe(500);
  });

  it('returns error when OPENROUTER_API_KEY is missing', () => {
    const result = loadLlmConfig({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('OPENROUTER_API_KEY');
    expect(result.error).toContain('https://openrouter.ai/keys');
  });

  it('returns error when OPENROUTER_API_KEY is empty string', () => {
    const result = loadLlmConfig({ OPENROUTER_API_KEY: '' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('OPENROUTER_API_KEY');
  });

  it('returns error when OPENROUTER_API_KEY is whitespace only', () => {
    const result = loadLlmConfig({ OPENROUTER_API_KEY: '   ' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('OPENROUTER_API_KEY');
  });

  it('uses custom LLM_MODEL when provided', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test',
      LLM_MODEL: 'anthropic/claude-sonnet-4',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.model).toBe('anthropic/claude-sonnet-4');
  });

  it('falls back to default model when LLM_MODEL is empty', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test',
      LLM_MODEL: '',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.model).toBe('openai/gpt-5.4');
  });

  it('uses custom LLM_TIMEOUT_MS when valid', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test',
      LLM_TIMEOUT_MS: '30000',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.timeoutMs).toBe(30_000);
  });

  it('falls back to default timeout for invalid LLM_TIMEOUT_MS', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test',
      LLM_TIMEOUT_MS: 'not-a-number',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.timeoutMs).toBe(15_000);
  });

  it('falls back to default timeout for negative LLM_TIMEOUT_MS', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test',
      LLM_TIMEOUT_MS: '-5000',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.timeoutMs).toBe(15_000);
  });

  it('uses custom LLM_MAX_PROMPT_LENGTH when valid', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test',
      LLM_MAX_PROMPT_LENGTH: '1000',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.maxPromptLength).toBe(1000);
  });

  it('falls back to default max length for invalid LLM_MAX_PROMPT_LENGTH', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test',
      LLM_MAX_PROMPT_LENGTH: 'abc',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.maxPromptLength).toBe(500);
  });

  it('trims whitespace from all env values', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: '  sk-test  ',
      LLM_MODEL: '  anthropic/claude-sonnet-4  ',
      LLM_TIMEOUT_MS: '  20000  ',
      LLM_MAX_PROMPT_LENGTH: '  800  ',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.apiKey).toBe('sk-test');
    expect(result.config.model).toBe('anthropic/claude-sonnet-4');
    expect(result.config.timeoutMs).toBe(20_000);
    expect(result.config.maxPromptLength).toBe(800);
  });

  it('floors fractional timeout to integer', () => {
    const result = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test',
      LLM_TIMEOUT_MS: '15500.9',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.timeoutMs).toBe(15_500);
  });
});
