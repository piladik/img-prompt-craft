import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { generatePrompt } from '../../src/normalization/index.js';
import { loadModelConfig } from '../../src/models/index.js';
import type { RawAnswers } from '../../src/cli/types.js';

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

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
    negativePrompt: ['blurry'],
  };
}

describe('error: invalid type', () => {
  it('fails at mapping stage', async () => {
    const result = await generatePrompt({ ...validAnswers(), type: 'video' }, MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
    expect(result.details).toBeDefined();
    expect(result.details!.some((d) => d.includes('type'))).toBe(true);
  });
});

describe('error: invalid model', () => {
  it('fails at mapping stage', async () => {
    const result = await generatePrompt({ ...validAnswers(), model: 'sdxl' }, MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
  });
});

describe('error: invalid style', () => {
  it('fails at mapping stage', async () => {
    const result = await generatePrompt({ ...validAnswers(), style: 'watercolor' }, MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
  });
});

describe('error: invalid negative prompt item', () => {
  it('fails at mapping stage', async () => {
    const result = await generatePrompt(
      { ...validAnswers(), negativePrompt: ['nonexistent-item'] },
      MODELS_DIR,
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
  });
});

describe('error: missing models directory', () => {
  it('fails at model-loading stage', async () => {
    const result = await generatePrompt(validAnswers(), '/nonexistent/path');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('model-loading');
    expect(result.error).toContain('not found');
  });
});

describe('error: missing model config file', () => {
  it('loadModelConfig returns actionable error', async () => {
    const result = await loadModelConfig('nonexistent-model', MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('not found');
    expect(result.error).toContain('nonexistent-model');
  });
});

describe('error: multiple invalid fields', () => {
  it('reports all validation issues', async () => {
    const result = await generatePrompt(
      {
        ...validAnswers(),
        type: 'video',
        model: 'sdxl',
        style: 'bad-style',
      },
      MODELS_DIR,
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe('mapping');
    expect(result.details!.length).toBeGreaterThanOrEqual(3);
  });
});
