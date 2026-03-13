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
};

function makeIntermediate(overrides?: Partial<IntermediatePrompt>): IntermediatePrompt {
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

describe('adaptToModel with minimal (required-only) input', () => {
  const minimalIntermediate: IntermediatePrompt = {
    type: 'image',
    model: 'flux',
    subject: 'young-woman',
    promptIntent: 'portrait of a young woman',
    metadata: { createdAt: '2026-03-09T00:00:00.000Z', appVersion: '0.1.0' },
  };

  it('produces a non-empty positive prompt with only required fields', () => {
    const result = adaptToModel(minimalIntermediate, fluxConfig);
    expect(result.positivePrompt.length).toBeGreaterThan(0);
    expect(result.positivePrompt).toContain('young woman');
  });

  it('returns empty negative prompt when negativePrompt is omitted', () => {
    const result = adaptToModel(minimalIntermediate, fluxConfig);
    expect(result.negativePrompt).toBe('');
  });

  it('output has only positivePrompt and negativePrompt', () => {
    const result = adaptToModel(minimalIntermediate, fluxConfig);
    expect(Object.keys(result).sort()).toEqual(['negativePrompt', 'positivePrompt']);
  });
});

describe('adaptToModel with partial optional fields', () => {
  it('handles mood + scene only', () => {
    const partial: IntermediatePrompt = {
      type: 'image',
      model: 'flux',
      subject: 'young-woman',
      mood: 'confident',
      scene: 'modern-city-street',
      promptIntent: 'confident young woman on a city street',
      metadata: { createdAt: '2026-03-09T00:00:00.000Z', appVersion: '0.1.0' },
    };
    const result = adaptToModel(partial, fluxConfig);
    expect(result.positivePrompt).toContain('confident');
    expect(result.positivePrompt).toContain('modern city street');
    expect(result.positivePrompt).toContain('young woman');
  });

  it('negativePrompt omitted produces empty string', () => {
    const partial: IntermediatePrompt = {
      type: 'image',
      model: 'flux',
      subject: 'young-man',
      style: 'cinematic-realism',
      promptIntent: 'cinematic portrait of a young man',
      metadata: { createdAt: '2026-03-09T00:00:00.000Z', appVersion: '0.1.0' },
    };
    const result = adaptToModel(partial, fluxConfig);
    expect(result.negativePrompt).toBe('');
  });

  it('negativePrompt selected but empty array produces empty string', () => {
    const partial: IntermediatePrompt = {
      type: 'image',
      model: 'flux',
      subject: 'young-woman',
      negativePrompt: [],
      promptIntent: 'portrait of a young woman',
      metadata: { createdAt: '2026-03-09T00:00:00.000Z', appVersion: '0.1.0' },
    };
    const result = adaptToModel(partial, fluxConfig);
    expect(result.negativePrompt).toBe('');
  });
});
