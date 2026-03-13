import { describe, it, expect, vi, afterEach } from 'vitest';
import { mapAnswersToSchema } from '../../src/domain/index.js';
import type { RawAnswers } from '../../src/cli/types.js';

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
    negativePrompt: ['blurry', 'bad-anatomy'],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mapAnswersToSchema', () => {
  it('returns success with valid answers', () => {
    const result = mapAnswersToSchema(validRawAnswers());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.type).toBe('image');
    expect(result.data.model).toBe('flux');
    expect(result.data.style).toBe('cinematic-realism');
    expect(result.data.subject).toBe('young-woman');
    expect(result.data.scene).toBe('modern-city-street');
    expect(result.data.mood).toBe('confident');
    expect(result.data.composition).toBe('medium-shot');
    expect(result.data.lighting).toBe('golden-hour-sunlight');
    expect(result.data.cameraLens).toBe('85mm-portrait-lens');
    expect(result.data.negativePrompt).toEqual(['blurry', 'bad-anatomy']);
  });

  it('generates a non-empty promptIntent', () => {
    const result = mapAnswersToSchema(validRawAnswers());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.promptIntent.length).toBeGreaterThan(0);
    expect(result.data.promptIntent).toContain('young woman');
    expect(result.data.promptIntent).toContain('cinematic realism');
  });

  it('attaches metadata with createdAt and appVersion', () => {
    const result = mapAnswersToSchema(validRawAnswers());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.metadata.appVersion).toBe('0.1.0');
    expect(result.data.metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts empty negativePrompt array', () => {
    const answers = { ...validRawAnswers(), negativePrompt: [] };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.negativePrompt).toEqual([]);
  });

  it('trims whitespace from string values', () => {
    const answers = { ...validRawAnswers(), style: '  cinematic-realism  ', mood: ' confident ' };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.style).toBe('cinematic-realism');
    expect(result.data.mood).toBe('confident');
  });

  it('trims whitespace from negativePrompt items', () => {
    const answers = { ...validRawAnswers(), negativePrompt: ['  blurry  ', ' bad-anatomy '] };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.negativePrompt).toEqual(['blurry', 'bad-anatomy']);
  });

  it('returns error for invalid type', () => {
    const answers = { ...validRawAnswers(), type: 'video' };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain('type');
  });

  it('returns error for invalid model', () => {
    const answers = { ...validRawAnswers(), model: 'sdxl' };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.includes('model'))).toBe(true);
  });

  it('returns error for invalid style', () => {
    const answers = { ...validRawAnswers(), style: 'impressionist' };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(false);
  });

  it('returns error for invalid negative prompt item', () => {
    const answers = { ...validRawAnswers(), negativePrompt: ['not-a-real-option'] };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((i) => i.includes('negativePrompt'))).toBe(true);
  });

  it('returns descriptive error message on failure', () => {
    const answers = { ...validRawAnswers(), type: 'video', model: 'sdxl' };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('Validation failed');
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe('mapAnswersToSchema with partial optional fields', () => {
  it('succeeds with required-only answers (minimal payload)', () => {
    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.type).toBe('image');
    expect(result.data.model).toBe('flux');
    expect(result.data.subject).toBe('young-woman');
    expect(result.data.style).toBeUndefined();
    expect(result.data.scene).toBeUndefined();
    expect(result.data.mood).toBeUndefined();
    expect(result.data.composition).toBeUndefined();
    expect(result.data.lighting).toBeUndefined();
    expect(result.data.cameraLens).toBeUndefined();
    expect(result.data.negativePrompt).toBeUndefined();
  });

  it('succeeds with required + subset of optional fields', () => {
    const answers: RawAnswers = {
      type: 'image',
      model: 'flux',
      subject: 'young-woman',
      mood: 'confident',
      scene: 'modern-city-street',
    };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.mood).toBe('confident');
    expect(result.data.scene).toBe('modern-city-street');
    expect(result.data.style).toBeUndefined();
    expect(result.data.composition).toBeUndefined();
  });

  it('generates a valid promptIntent from required-only answers', () => {
    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.promptIntent).toContain('young woman');
    expect(result.data.promptIntent.length).toBeGreaterThan(0);
  });

  it('generates a promptIntent including only provided optional fields', () => {
    const answers: RawAnswers = {
      type: 'image',
      model: 'flux',
      subject: 'young-man',
      mood: 'dramatic',
      lighting: 'neon-night-lighting',
    };
    const result = mapAnswersToSchema(answers);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.promptIntent).toContain('dramatic');
    expect(result.data.promptIntent).toContain('young man');
    expect(result.data.promptIntent).toContain('neon night lighting');
    expect(result.data.promptIntent).not.toContain('cinematic');
  });
});
