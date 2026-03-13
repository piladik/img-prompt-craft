import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { generatePrompt } from '../../src/normalization/index.js';
import type { LlmOptions } from '../../src/normalization/index.js';
import type { LlmClient, LlmConfig } from '../../src/llm/index.js';
import type { RawAnswers } from '../../src/cli/types.js';
import { OPTIONAL_FIELD_IDS } from '../../src/cli/optional-fields.js';

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

const llmConfig: LlmConfig = {
  apiKey: 'sk-test',
  model: 'openai/gpt-5.4',
  baseUrl: 'https://openrouter.ai/api/v1',
  timeoutMs: 15_000,
  maxPromptLength: 500,
};

function makeAnswers(overrides?: Partial<RawAnswers>): RawAnswers {
  return {
    type: 'image',
    model: 'flux',
    style: 'cinematic-realism',
    subject: 'young-woman',
    scene: 'modern-city-street',
    mood: 'confident',
    composition: 'medium-shot',
    lighting: 'golden-hour-sunlight',
    cameraLens: '85mm-portrait-lens',
    negativePrompt: ['blurry', 'bad-anatomy', 'deformed-hands'],
    selectedOptionalInputs: [...OPTIONAL_FIELD_IDS],
    ...overrides,
  };
}

function mockClient(impl: (sys: string, usr: string) => Promise<string>): LlmClient {
  return { complete: vi.fn(impl) };
}

describe('full pipeline with LLM enabled and successful', () => {
  it('replaces positive prompt with LLM rewritten version', async () => {
    const rewritten =
      'A confident young woman stands on a bustling modern city street, bathed in warm golden hour sunlight, captured in a cinematic medium shot through an 85mm portrait lens.';
    const client = mockClient(async () => rewritten);
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('llm');
    expect(result.output.positivePrompt).toBe(rewritten);
    expect(result.llmWarning).toBeUndefined();
  });

  it('keeps negative prompt from deterministic output', async () => {
    const rewritten = 'A confident woman on a sunlit city street captured cinematically.';
    const client = mockClient(async () => rewritten);
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt).toBe('blurry, bad anatomy, deformed hands');
  });

  it('passes the deterministic prompt to the LLM client', async () => {
    const rewritten = 'A confident woman on a sunlit street at golden hour.';
    const client = mockClient(async () => rewritten);
    const llmOptions: LlmOptions = { config: llmConfig, client };

    await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    const [, userArg] = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(userArg).toContain(
      'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism',
    );
  });
});

describe('full pipeline with LLM enabled but LLM fails', () => {
  it('falls back to deterministic prompt on network error', async () => {
    const client = mockClient(async () => {
      throw new Error('Connection refused');
    });
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('deterministic');
    expect(result.output.positivePrompt).toBe(
      'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism',
    );
    expect(result.llmWarning).toContain('Connection refused');
  });

  it('falls back to deterministic when LLM returns invalid response', async () => {
    const client = mockClient(async () => 'A sunset over the ocean with no people.');
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('deterministic');
    expect(result.llmWarning).toContain('subject');
  });

  it('falls back to deterministic when LLM returns metadata-laden response', async () => {
    const client = mockClient(async () => "Here's the rewritten prompt: A woman on a street.");
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('deterministic');
    expect(result.llmWarning).toContain('metadata');
  });

  it('preserves full deterministic output on fallback', async () => {
    const client = mockClient(async () => {
      throw new Error('Timeout');
    });
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const result = await generatePrompt(makeAnswers(), MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt).toBe('blurry, bad anatomy, deformed hands');
  });
});

describe('full pipeline with LLM and minimal answers (required-only)', () => {
  it('replaces positive prompt even when only required fields are present', async () => {
    const rewritten = 'A young woman stands in a quiet, contemplative pose.';
    const client = mockClient(async () => rewritten);
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = await generatePrompt(answers, MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('llm');
    expect(result.output.positivePrompt).toBe(rewritten);
    expect(result.output.negativePrompt).toBe('');
  });

  it('falls back to deterministic on LLM failure with required-only answers', async () => {
    const client = mockClient(async () => {
      throw new Error('Service unavailable');
    });
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = await generatePrompt(answers, MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('deterministic');
    expect(result.llmWarning).toContain('Service unavailable');
    expect(result.output.positivePrompt.toLowerCase()).toContain('young woman');
  });
});

describe('full pipeline with LLM and partial optionals', () => {
  it('works with mood + scene only', async () => {
    const rewritten = 'A mysterious young man on a rooftop at sunset.';
    const client = mockClient(async () => rewritten);
    const llmOptions: LlmOptions = { config: llmConfig, client };

    const answers: RawAnswers = {
      type: 'image',
      model: 'flux',
      subject: 'young-man',
      mood: 'mysterious',
      scene: 'rooftop-at-sunset',
      selectedOptionalInputs: ['mood', 'scene'],
    };
    const result = await generatePrompt(answers, MODELS_DIR, llmOptions);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('llm');
    expect(result.output.positivePrompt).toBe(rewritten);
  });
});

describe('full pipeline without LLM (unchanged behavior)', () => {
  it('produces deterministic output with normalizedBy set to deterministic', async () => {
    const result = await generatePrompt(makeAnswers(), MODELS_DIR);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.normalizedBy).toBe('deterministic');
    expect(result.output.positivePrompt).toBe(
      'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism',
    );
    expect(result.llmWarning).toBeUndefined();
  });

  it('error stages remain unchanged for mapping failures', async () => {
    const answers = { ...makeAnswers(), type: 'video' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
  });

  it('error stages remain unchanged for model-loading failures', async () => {
    const result = await generatePrompt(makeAnswers(), join(MODELS_DIR, 'nonexistent'));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('model-loading');
  });
});
