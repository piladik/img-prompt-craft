import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { buildSystemPrompt, buildUserPrompt } from '../../src/llm/index.js';
import type { LlmConfig } from '../../src/llm/index.js';
import type { ModelConfig } from '../../src/models/model-config-schema.js';
import type { IntermediatePrompt } from '../../src/domain/schema.js';

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

const fluxConfig: ModelConfig = {
  id: 'flux',
  label: 'Flux',
  promptStrategy: 'natural-language',
  promptGuidance: 'Flux responds best to natural-language prompts.',
  positivePromptTemplate: '{composition} of a {mood} {subject}',
  negativePromptSeparator: ', ',
  defaultNegativePrefix: '',
  aspectRatioMap: { '1:1': { width: 1024, height: 1024 } },
};

const baseLlmConfig: LlmConfig = {
  apiKey: 'sk-test',
  model: 'openai/gpt-5.4',
  baseUrl: 'https://openrouter.ai/api/v1',
  timeoutMs: 15_000,
  maxPromptLength: 500,
};

const sampleIntermediate: IntermediatePrompt = {
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
  promptIntent: 'A confident young woman on a city street at golden hour',
  metadata: { createdAt: '2026-03-09T12:00:00.000Z', appVersion: '0.1.0' },
};

describe('buildSystemPrompt', () => {
  it('loads the flux template and fills all placeholders', async () => {
    const result = await buildSystemPrompt(fluxConfig, baseLlmConfig, MODELS_DIR);

    expect(result).toContain('Flux');
    expect(result).toContain('Flux responds best to natural-language prompts.');
    expect(result).toContain('500');
    expect(result).not.toContain('{model.label}');
    expect(result).not.toContain('{model.promptGuidance}');
    expect(result).not.toContain('{maxLength}');
  });

  it('replaces all occurrences of {model.label}', async () => {
    const result = await buildSystemPrompt(fluxConfig, baseLlmConfig, MODELS_DIR);

    const labelCount = (result.match(/Flux/g) ?? []).length;
    expect(labelCount).toBeGreaterThanOrEqual(2);
  });

  it('uses the maxPromptLength from LlmConfig', async () => {
    const customConfig = { ...baseLlmConfig, maxPromptLength: 1000 };
    const result = await buildSystemPrompt(fluxConfig, customConfig, MODELS_DIR);

    expect(result).toContain('1000');
    expect(result).not.toContain('500');
  });

  it('uses the promptGuidance from ModelConfig', async () => {
    const customModel: ModelConfig = {
      ...fluxConfig,
      promptGuidance: 'Custom guidance for testing purposes.',
    };
    const result = await buildSystemPrompt(customModel, baseLlmConfig, MODELS_DIR);

    expect(result).toContain('Custom guidance for testing purposes.');
  });

  it('throws when the template file does not exist', async () => {
    const badModel: ModelConfig = { ...fluxConfig, id: 'nonexistent' };

    await expect(
      buildSystemPrompt(badModel, baseLlmConfig, MODELS_DIR),
    ).rejects.toThrow();
  });
});

describe('buildUserPrompt', () => {
  const deterministicPrompt =
    'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism';

  it('includes the deterministic prompt', () => {
    const result = buildUserPrompt(deterministicPrompt, sampleIntermediate);

    expect(result).toContain(`Original prompt: ${deterministicPrompt}`);
  });

  it('includes all user selections', () => {
    const result = buildUserPrompt(deterministicPrompt, sampleIntermediate);

    expect(result).toContain('- Style: cinematic-realism');
    expect(result).toContain('- Subject: young-woman');
    expect(result).toContain('- Scene: modern-city-street');
    expect(result).toContain('- Mood: confident');
    expect(result).toContain('- Composition: medium-shot');
    expect(result).toContain('- Lighting: golden-hour-sunlight');
    expect(result).toContain('- Camera/Lens: 85mm-portrait-lens');
  });

  it('contains a User selections header', () => {
    const result = buildUserPrompt(deterministicPrompt, sampleIntermediate);

    expect(result).toContain('User selections:');
  });

  it('produces different output for different intermediates', () => {
    const altIntermediate: IntermediatePrompt = {
      ...sampleIntermediate,
      style: 'dark-moody-portrait',
      mood: 'mysterious',
      subject: 'young-man',
    };

    const result1 = buildUserPrompt(deterministicPrompt, sampleIntermediate);
    const result2 = buildUserPrompt('Alt prompt', altIntermediate);

    expect(result1).not.toBe(result2);
    expect(result2).toContain('- Style: dark-moody-portrait');
    expect(result2).toContain('- Mood: mysterious');
    expect(result2).toContain('- Subject: young-man');
  });

  it('does not include negative prompt or aspect ratio', () => {
    const result = buildUserPrompt(deterministicPrompt, sampleIntermediate);

    expect(result).not.toContain('blurry');
    expect(result).not.toContain('16:9');
    expect(result).not.toContain('Negative');
    expect(result).not.toContain('Aspect');
  });
});
