import { describe, it, expect } from 'vitest';
import { intermediatePromptSchema } from '../../src/domain/index.js';

function validInput() {
  return {
    type: 'image' as const,
    model: 'flux' as const,
    style: 'cinematic-realism' as const,
    subject: 'young-woman' as const,
    scene: 'modern-city-street' as const,
    mood: 'confident' as const,
    aspectRatio: '16:9' as const,
    composition: 'medium-shot' as const,
    lighting: 'golden-hour-sunlight' as const,
    cameraLens: '85mm-portrait-lens' as const,
    negativePrompt: ['blurry', 'bad-anatomy'] as const,
    promptIntent: 'medium shot of a confident young woman in a modern city street',
    metadata: {
      createdAt: '2026-03-09T00:00:00.000Z',
      appVersion: '0.1.0',
    },
  };
}

describe('intermediatePromptSchema', () => {
  it('accepts a fully valid input', () => {
    const result = intermediatePromptSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it('accepts empty negativePrompt array', () => {
    const input = { ...validInput(), negativePrompt: [] };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts all 10 negative prompt items at once', () => {
    const input = {
      ...validInput(),
      negativePrompt: [
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
      ],
    };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects unknown type value', () => {
    const input = { ...validInput(), type: 'video' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown model value', () => {
    const input = { ...validInput(), model: 'sdxl' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown style value', () => {
    const input = { ...validInput(), style: 'watercolor' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown subject value', () => {
    const input = { ...validInput(), subject: 'old-man' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown scene value', () => {
    const input = { ...validInput(), scene: 'underwater-cave' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown mood value', () => {
    const input = { ...validInput(), mood: 'angry' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown aspect ratio value', () => {
    const input = { ...validInput(), aspectRatio: '21:9' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown composition value', () => {
    const input = { ...validInput(), composition: 'aerial' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown lighting value', () => {
    const input = { ...validInput(), lighting: 'candle-light' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown camera lens value', () => {
    const input = { ...validInput(), cameraLens: '14mm-ultra-wide' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects unknown negative prompt item', () => {
    const input = { ...validInput(), negativePrompt: ['nonexistent-tag'] };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = intermediatePromptSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty promptIntent', () => {
    const input = { ...validInput(), promptIntent: '' };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing metadata', () => {
    const { metadata: _, ...rest } = validInput();
    const result = intermediatePromptSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime in metadata', () => {
    const input = { ...validInput(), metadata: { createdAt: 'not-a-date', appVersion: '0.1.0' } };
    const result = intermediatePromptSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
