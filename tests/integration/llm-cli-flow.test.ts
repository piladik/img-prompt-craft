import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { generatePrompt } from '../../src/normalization/index.js';
import type { LlmOptions } from '../../src/normalization/index.js';
import { loadLlmConfig, createLlmClient } from '../../src/llm/index.js';
import type { LlmClient, LlmConfig } from '../../src/llm/index.js';
import type { RawAnswers } from '../../src/cli/types.js';

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

function makeAnswers(overrides?: Partial<RawAnswers>): RawAnswers {
  return {
    type: 'image',
    model: 'flux',
    style: 'cinematic-realism',
    subject: 'young-woman',
    scene: 'modern-city-street',
    mood: 'confident',
    aspectRatio: '16:9',
    composition: 'medium-shot',
    lighting: 'golden-hour-sunlight',
    cameraLens: '85mm-portrait-lens',
    negativePrompt: ['blurry', 'bad-anatomy', 'deformed-hands'],
    ...overrides,
  };
}

function mockClient(impl: (sys: string, usr: string) => Promise<string>): LlmClient {
  return { complete: vi.fn(impl) };
}

describe('CLI flow: --llm with valid API key (mocked)', () => {
  it('loads config, creates client, and generates LLM-enhanced output', async () => {
    const configResult = loadLlmConfig({ OPENROUTER_API_KEY: 'sk-test-key' });
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const rewritten = 'A confident young woman walks through a golden-lit modern city street, captured in a cinematic medium shot through an 85mm portrait lens.';
    const client = mockClient(async () => rewritten);
    const llmOptions: LlmOptions = { config: configResult.config, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('llm');
    expect(result.output.positivePrompt).toBe(rewritten);
    expect(result.output.negativePrompt).toBe('blurry, bad anatomy, deformed hands');
    expect(result.output.width).toBe(1344);
    expect(result.output.height).toBe(768);
  });

  it('uses custom model from LLM_MODEL env var', async () => {
    const configResult = loadLlmConfig({
      OPENROUTER_API_KEY: 'sk-test-key',
      LLM_MODEL: 'anthropic/claude-sonnet-4',
    });
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;
    expect(configResult.config.model).toBe('anthropic/claude-sonnet-4');

    const client = mockClient(async () => 'A confident woman walks the city streets at golden hour.');
    const llmOptions: LlmOptions = { config: configResult.config, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('llm');
  });

  it('falls back gracefully when LLM client fails after retries', async () => {
    const configResult = loadLlmConfig({ OPENROUTER_API_KEY: 'sk-test-key' });
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const client = mockClient(async () => {
      throw new Error('LLM request timed out. Try again or use deterministic mode.');
    });
    const llmOptions: LlmOptions = { config: configResult.config, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('deterministic');
    expect(result.llmWarning).toContain('timed out');
    expect(result.output.positivePrompt).toBe(
      'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism',
    );
  });

  it('works end-to-end with different user selections', async () => {
    const configResult = loadLlmConfig({ OPENROUTER_API_KEY: 'sk-test-key' });
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const rewritten = 'A mysterious young man lingers inside a cozy cafe, soft window light casting gentle shadows, captured through a 50mm lens in a dark moody portrait style.';
    const client = mockClient(async () => rewritten);
    const llmOptions: LlmOptions = { config: configResult.config, client };

    const answers = makeAnswers({
      style: 'dark-moody-portrait',
      subject: 'young-man',
      scene: 'cozy-cafe-interior',
      mood: 'mysterious',
      lighting: 'soft-window-light',
      cameraLens: '50mm-natural-perspective',
      composition: 'close-up-portrait',
      aspectRatio: '4:5',
    });

    const result = await generatePrompt(answers, MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('llm');
    expect(result.output.positivePrompt).toBe(rewritten);
    expect(result.output.width).toBe(896);
    expect(result.output.height).toBe(1120);
  });
});

describe('CLI flow: --llm with missing API key (startup error)', () => {
  it('rejects with clear error when OPENROUTER_API_KEY is missing', () => {
    const configResult = loadLlmConfig({});
    expect(configResult.success).toBe(false);
    if (configResult.success) return;
    expect(configResult.error).toContain('OPENROUTER_API_KEY');
    expect(configResult.error).toContain('https://openrouter.ai/keys');
  });

  it('rejects with clear error when OPENROUTER_API_KEY is empty', () => {
    const configResult = loadLlmConfig({ OPENROUTER_API_KEY: '' });
    expect(configResult.success).toBe(false);
    if (configResult.success) return;
    expect(configResult.error).toContain('OPENROUTER_API_KEY');
  });
});

describe('CLI flow: without --llm flag (unchanged behavior)', () => {
  it('produces deterministic output without LLM options', async () => {
    const result = await generatePrompt(makeAnswers(), MODELS_DIR);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('deterministic');
    expect(result.llmWarning).toBeUndefined();
    expect(result.output.positivePrompt).toBe(
      'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism',
    );
  });

  it('handles pipeline errors without LLM interference', async () => {
    const answers = { ...makeAnswers(), type: 'video' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
  });
});
