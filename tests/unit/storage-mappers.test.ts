import { describe, it, expect } from 'vitest';
import { mapToPromptRunInsert } from '../../src/storage/index.js';
import type { RawAnswers } from '../../src/cli/types.js';
import type { GenerationSuccess } from '../../src/normalization/generate.js';
import type { LlmConfig } from '../../src/llm/types.js';

function validAnswers(): RawAnswers {
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
    negativePrompt: ['blurry', 'bad-anatomy'],
  };
}

function deterministicResult(): GenerationSuccess {
  return {
    success: true,
    intermediate: {} as GenerationSuccess['intermediate'],
    output: {
      positivePrompt: 'A confident young woman walking through a modern city street',
      negativePrompt: 'blurry, bad-anatomy',
      width: 1344,
      height: 768,
    },
    normalizedBy: 'deterministic',
  };
}

function llmResult(): GenerationSuccess {
  return {
    ...deterministicResult(),
    normalizedBy: 'llm',
    output: {
      ...deterministicResult().output,
      positivePrompt: 'Cinematic shot of a confident young woman on a modern city street',
    },
  };
}

function llmConfig(): LlmConfig {
  return {
    apiKey: 'sk-test',
    model: 'openai/gpt-5.4',
    baseUrl: 'https://openrouter.ai/api/v1',
    timeoutMs: 15_000,
    maxPromptLength: 500,
  };
}

describe('mapToPromptRunInsert', () => {
  it('maps a deterministic result correctly', () => {
    const insert = mapToPromptRunInsert({
      answers: validAnswers(),
      result: deterministicResult(),
      appVersion: '0.1.0',
    });

    expect(insert.type).toBe('image');
    expect(insert.model).toBe('flux');
    expect(insert.style).toBe('cinematic-realism');
    expect(insert.subject).toBe('young-woman');
    expect(insert.scene).toBe('modern-city-street');
    expect(insert.mood).toBe('confident');
    expect(insert.aspectRatio).toBe('16:9');
    expect(insert.composition).toBe('medium-shot');
    expect(insert.lighting).toBe('golden-hour-sunlight');
    expect(insert.cameraLens).toBe('85mm-portrait-lens');
    expect(insert.normalizedBy).toBe('deterministic');
    expect(insert.positivePrompt).toContain('confident young woman');
    expect(insert.negativePrompt).toBe('blurry, bad-anatomy');
    expect(insert.width).toBe(1344);
    expect(insert.height).toBe(768);
    expect(insert.llmProvider).toBeNull();
    expect(insert.llmModel).toBeNull();
    expect(insert.llmWarning).toBeNull();
    expect(insert.appVersion).toBe('0.1.0');
    expect(insert.storageVersion).toBe(1);
  });

  it('maps an LLM result with provider and model', () => {
    const insert = mapToPromptRunInsert({
      answers: validAnswers(),
      result: llmResult(),
      appVersion: '0.1.0',
      llmConfig: llmConfig(),
    });

    expect(insert.normalizedBy).toBe('llm');
    expect(insert.llmProvider).toBe('openai');
    expect(insert.llmModel).toBe('openai/gpt-5.4');
    expect(insert.llmWarning).toBeNull();
  });

  it('sets llmWarning when present on a deterministic fallback', () => {
    const result: GenerationSuccess = {
      ...deterministicResult(),
      llmWarning: 'LLM timeout after 15000ms',
    };
    const insert = mapToPromptRunInsert({
      answers: validAnswers(),
      result,
      appVersion: '0.1.0',
      llmConfig: llmConfig(),
    });

    expect(insert.normalizedBy).toBe('deterministic');
    expect(insert.llmProvider).toBeNull();
    expect(insert.llmModel).toBeNull();
    expect(insert.llmWarning).toBe('LLM timeout after 15000ms');
  });

  it('extracts provider from model id with slash', () => {
    const config: LlmConfig = { ...llmConfig(), model: 'anthropic/claude-sonnet-4' };
    const insert = mapToPromptRunInsert({
      answers: validAnswers(),
      result: llmResult(),
      appVersion: '0.1.0',
      llmConfig: config,
    });

    expect(insert.llmProvider).toBe('anthropic');
    expect(insert.llmModel).toBe('anthropic/claude-sonnet-4');
  });

  it('uses full model id as provider when no slash present', () => {
    const config: LlmConfig = { ...llmConfig(), model: 'gpt-5.4' };
    const insert = mapToPromptRunInsert({
      answers: validAnswers(),
      result: llmResult(),
      appVersion: '0.1.0',
      llmConfig: config,
    });

    expect(insert.llmProvider).toBe('gpt-5.4');
    expect(insert.llmModel).toBe('gpt-5.4');
  });

  it('nulls LLM fields when no llmConfig provided for deterministic run', () => {
    const insert = mapToPromptRunInsert({
      answers: validAnswers(),
      result: deterministicResult(),
      appVersion: '0.1.0',
    });

    expect(insert.llmProvider).toBeNull();
    expect(insert.llmModel).toBeNull();
  });
});
