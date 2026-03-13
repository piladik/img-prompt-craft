import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { generatePrompt } from '../../src/normalization/index.js';
import type { RawAnswers } from '../../src/cli/types.js';

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

function validRawAnswers(): RawAnswers {
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
  };
}

describe('generatePrompt pipeline', () => {
  it('succeeds end-to-end with valid answers and real Flux config', async () => {
    const result = await generatePrompt(validRawAnswers(), MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.positivePrompt).toBe(
      'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism',
    );
    expect(result.output.negativePrompt).toBe('blurry, bad anatomy, deformed hands');
  });

  it('returns the validated intermediate schema in the result', async () => {
    const result = await generatePrompt(validRawAnswers(), MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.intermediate.type).toBe('image');
    expect(result.intermediate.model).toBe('flux');
    expect(result.intermediate.promptIntent.length).toBeGreaterThan(0);
    expect(result.intermediate.metadata.appVersion).toBe('0.1.0');
  });

  it('works with empty negative prompt', async () => {
    const answers = { ...validRawAnswers(), negativePrompt: [] as string[] };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt).toBe('');
  });

  it('works with young-man subject', async () => {
    const answers = { ...validRawAnswers(), subject: 'young-man' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.positivePrompt).toContain('young man');
  });

  it('works with all style options', async () => {
    const styles = [
      'cinematic-realism',
      'fashion-editorial',
      'natural-lifestyle-photography',
      'dark-moody-portrait',
      'luxury-commercial-photo',
    ];
    for (const style of styles) {
      const answers = { ...validRawAnswers(), style };
      const result = await generatePrompt(answers, MODELS_DIR);
      expect(result.success).toBe(true);
    }
  });

  it('succeeds with required-only answers (no optional fields)', async () => {
    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.positivePrompt).toBeDefined();
    expect(result.output.positivePrompt.length).toBeGreaterThan(0);
  });

  it('fails at mapping stage for invalid type', async () => {
    const answers = { ...validRawAnswers(), type: 'video' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
    expect(result.error).toContain('Validation failed');
    expect(result.details).toBeDefined();
    expect(result.details!.length).toBeGreaterThan(0);
  });

  it('fails at mapping stage for invalid model', async () => {
    const answers = { ...validRawAnswers(), model: 'sdxl' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
  });

  it('fails at model-loading stage for missing model directory', async () => {
    const answers = validRawAnswers();
    const result = await generatePrompt(answers, join(MODELS_DIR, 'nonexistent-parent'));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('model-loading');
    expect(result.error).toContain('not found');
  });

  it('succeeds with partial optional fields (mood + scene only)', async () => {
    const answers: RawAnswers = {
      type: 'image',
      model: 'flux',
      subject: 'young-woman',
      mood: 'confident',
      scene: 'modern-city-street',
    };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.positivePrompt).toContain('young woman');
    expect(result.output.positivePrompt).toContain('confident');
    expect(result.output.positivePrompt).toContain('modern city street');
  });

  it('returns empty negativePrompt when field is omitted', async () => {
    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt).toBe('');
  });

  it('returns empty negativePrompt when selected but empty array', async () => {
    const answers: RawAnswers = {
      type: 'image',
      model: 'flux',
      subject: 'young-woman',
      negativePrompt: [],
    };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt).toBe('');
  });

  it('output contains only positivePrompt and negativePrompt', async () => {
    const result = await generatePrompt(validRawAnswers(), MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(Object.keys(result.output).sort()).toEqual(['negativePrompt', 'positivePrompt']);
  });
});
