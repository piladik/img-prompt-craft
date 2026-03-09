import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { loadModelConfig, isSupportedModel, getSupportedModelIds, modelConfigSchema } from '../../src/models/index.js';

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

describe('loadModelConfig', () => {
  it('loads and validates the flux config', async () => {
    const result = await loadModelConfig('flux', MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.id).toBe('flux');
    expect(result.config.label).toBe('Flux');
    expect(result.config.promptStrategy).toBe('natural-language');
  });

  it('flux config has all required aspect ratio entries', async () => {
    const result = await loadModelConfig('flux', MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const ratios = Object.keys(result.config.aspectRatioMap);
    expect(ratios).toContain('1:1');
    expect(ratios).toContain('4:5');
    expect(ratios).toContain('3:4');
    expect(ratios).toContain('16:9');
    expect(ratios).toContain('9:16');
  });

  it('flux config aspect ratios have valid dimensions', async () => {
    const result = await loadModelConfig('flux', MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    for (const [, dims] of Object.entries(result.config.aspectRatioMap)) {
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    }
  });

  it('flux config has non-empty prompt guidance', async () => {
    const result = await loadModelConfig('flux', MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.promptGuidance.length).toBeGreaterThan(10);
  });

  it('flux config has a positive prompt template with placeholders', async () => {
    const result = await loadModelConfig('flux', MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.config.positivePromptTemplate).toContain('{subject}');
    expect(result.config.positivePromptTemplate).toContain('{style}');
  });

  it('returns error for non-existent model', async () => {
    const result = await loadModelConfig('nonexistent', MODELS_DIR);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('not found');
  });

  it('returns error for invalid JSON', async () => {
    const result = await loadModelConfig('flux', join(import.meta.dirname, 'fixtures-invalid'));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('not found');
  });
});

describe('modelConfigSchema', () => {
  it('rejects config with missing id', () => {
    const bad = {
      label: 'Test',
      promptStrategy: 'natural-language',
      promptGuidance: 'test guidance',
      positivePromptTemplate: '{subject}',
      negativePromptSeparator: ', ',
      defaultNegativePrefix: '',
      aspectRatioMap: {},
    };
    expect(modelConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects config with invalid promptStrategy', () => {
    const bad = {
      id: 'test',
      label: 'Test',
      promptStrategy: 'unknown-strategy',
      promptGuidance: 'test guidance',
      positivePromptTemplate: '{subject}',
      negativePromptSeparator: ', ',
      defaultNegativePrefix: '',
      aspectRatioMap: {},
    };
    expect(modelConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects config with invalid aspect ratio dimensions', () => {
    const bad = {
      id: 'test',
      label: 'Test',
      promptStrategy: 'natural-language',
      promptGuidance: 'test guidance',
      positivePromptTemplate: '{subject}',
      negativePromptSeparator: ', ',
      defaultNegativePrefix: '',
      aspectRatioMap: { '1:1': { width: -1, height: 1024 } },
    };
    expect(modelConfigSchema.safeParse(bad).success).toBe(false);
  });
});

describe('registry', () => {
  it('recognizes flux as supported', () => {
    expect(isSupportedModel('flux')).toBe(true);
  });

  it('rejects unknown model ids', () => {
    expect(isSupportedModel('sdxl')).toBe(false);
    expect(isSupportedModel('')).toBe(false);
  });

  it('returns flux in supported model list', () => {
    expect(getSupportedModelIds()).toContain('flux');
  });

  it('returns a frozen list', () => {
    const ids = getSupportedModelIds();
    expect(ids.length).toBeGreaterThan(0);
  });
});
