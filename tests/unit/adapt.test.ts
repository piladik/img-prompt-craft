import { describe, it, expect } from 'vitest';
import { adaptToModel } from '../../src/normalization/index.js';
import type { IntermediatePrompt } from '../../src/domain/index.js';
import type { ModelConfig } from '../../src/models/index.js';

const fluxConfig: ModelConfig = {
  id: 'flux',
  label: 'Flux',
  promptStrategy: 'natural-language',
  promptGuidance: 'Use natural language descriptions.',
  positivePromptTemplate:
    '{composition} of a {mood} {subject}, {scene}, {lighting}, shot on {cameraLens}, {style}',
  negativePromptSeparator: ', ',
  defaultNegativePrefix: '',
  aspectRatioMap: {
    '1:1': { width: 1024, height: 1024 },
    '4:5': { width: 896, height: 1120 },
    '3:4': { width: 896, height: 1152 },
    '16:9': { width: 1344, height: 768 },
    '9:16': { width: 768, height: 1344 },
  },
};

function makeIntermediate(overrides?: Partial<IntermediatePrompt>): IntermediatePrompt {
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
    promptIntent: 'medium shot of a confident young woman in a modern city street',
    metadata: { createdAt: '2026-03-09T00:00:00.000Z', appVersion: '0.1.0' },
    ...overrides,
  };
}

describe('adaptToModel (Flux)', () => {
  it('produces a positive prompt matching the example output', () => {
    const result = adaptToModel(makeIntermediate(), fluxConfig);
    expect(result.positivePrompt).toBe(
      'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism',
    );
  });

  it('produces a negative prompt joined by the model separator', () => {
    const result = adaptToModel(makeIntermediate(), fluxConfig);
    expect(result.negativePrompt).toBe('blurry, bad anatomy, deformed hands');
  });

  it('resolves 16:9 aspect ratio to correct pixel dimensions', () => {
    const result = adaptToModel(makeIntermediate(), fluxConfig);
    expect(result.width).toBe(1344);
    expect(result.height).toBe(768);
  });

  it('resolves 1:1 aspect ratio', () => {
    const result = adaptToModel(makeIntermediate({ aspectRatio: '1:1' }), fluxConfig);
    expect(result.width).toBe(1024);
    expect(result.height).toBe(1024);
  });

  it('resolves 9:16 aspect ratio', () => {
    const result = adaptToModel(makeIntermediate({ aspectRatio: '9:16' }), fluxConfig);
    expect(result.width).toBe(768);
    expect(result.height).toBe(1344);
  });

  it('returns empty string for negative prompt when no items selected', () => {
    const result = adaptToModel(makeIntermediate({ negativePrompt: [] }), fluxConfig);
    expect(result.negativePrompt).toBe('');
  });

  it('handles a single negative prompt item without trailing separator', () => {
    const result = adaptToModel(makeIntermediate({ negativePrompt: ['blurry'] }), fluxConfig);
    expect(result.negativePrompt).toBe('blurry');
  });

  it('humanizes hyphenated values in positive prompt', () => {
    const result = adaptToModel(
      makeIntermediate({ style: 'dark-moody-portrait', lighting: 'neon-night-lighting' }),
      fluxConfig,
    );
    expect(result.positivePrompt).toContain('dark moody portrait');
    expect(result.positivePrompt).toContain('neon night lighting');
  });

  it('capitalizes composition in the positive prompt', () => {
    const result = adaptToModel(
      makeIntermediate({ composition: 'close-up-portrait' }),
      fluxConfig,
    );
    expect(result.positivePrompt).toMatch(/^Close up portrait/);
  });

  it('falls back to 1024x1024 for unknown aspect ratio', () => {
    const custom = makeIntermediate();
    (custom as Record<string, unknown>).aspectRatio = 'unknown';
    const result = adaptToModel(custom as IntermediatePrompt, fluxConfig);
    expect(result.width).toBe(1024);
    expect(result.height).toBe(1024);
  });

  it('works with young-man subject', () => {
    const result = adaptToModel(makeIntermediate({ subject: 'young-man' }), fluxConfig);
    expect(result.positivePrompt).toContain('young man');
  });

  it('works with all negative prompt items', () => {
    const all: IntermediatePrompt['negativePrompt'] = [
      'blurry',
      'low-detail-skin',
      'bad-anatomy',
      'deformed-hands',
      'extra-fingers',
      'asymmetrical-eyes',
      'unnatural-face',
      'waxy-skin',
      'text-watermark',
      'jpeg-artifacts',
    ];
    const result = adaptToModel(makeIntermediate({ negativePrompt: all }), fluxConfig);
    expect(result.negativePrompt).toBe(
      'blurry, low detail skin, bad anatomy, deformed hands, extra fingers, asymmetrical eyes, unnatural face, waxy skin, text watermark, jpeg artifacts',
    );
  });
});

describe('adaptToModel with custom config', () => {
  it('respects a different template', () => {
    const customConfig: ModelConfig = {
      ...fluxConfig,
      positivePromptTemplate: '{subject} in {scene}, {style}',
    };
    const result = adaptToModel(makeIntermediate(), customConfig);
    expect(result.positivePrompt).toBe('young woman in modern city street, cinematic realism');
  });

  it('respects a different negative separator', () => {
    const customConfig: ModelConfig = {
      ...fluxConfig,
      negativePromptSeparator: ' | ',
    };
    const result = adaptToModel(makeIntermediate(), customConfig);
    expect(result.negativePrompt).toBe('blurry | bad anatomy | deformed hands');
  });

  it('prepends defaultNegativePrefix when set', () => {
    const customConfig: ModelConfig = {
      ...fluxConfig,
      defaultNegativePrefix: 'worst quality, ',
    };
    const result = adaptToModel(makeIntermediate(), customConfig);
    expect(result.negativePrompt).toMatch(/^worst quality, blurry/);
  });

  it('does not prepend defaultNegativePrefix when no items selected', () => {
    const customConfig: ModelConfig = {
      ...fluxConfig,
      defaultNegativePrefix: 'worst quality, ',
    };
    const result = adaptToModel(makeIntermediate({ negativePrompt: [] }), customConfig);
    expect(result.negativePrompt).toBe('');
  });
});
