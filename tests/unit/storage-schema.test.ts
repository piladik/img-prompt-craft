import { describe, it, expect } from 'vitest';
import { decodePromptRunRow, decodePromptRunSummary } from '../../src/storage/index.js';

function validDbRow() {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    created_at: '2026-03-09T12:00:00.000Z',
    type: 'image',
    model: 'flux',
    style: 'cinematic-realism',
    subject: 'young-woman',
    scene: 'modern-city-street',
    mood: 'confident',
    composition: 'medium-shot',
    lighting: 'golden-hour-sunlight',
    camera_lens: '85mm-portrait-lens',
    normalized_by: 'deterministic',
    positive_prompt: 'A confident young woman walking through a modern city street at golden hour',
    negative_prompt: 'blurry, bad-anatomy',
    llm_provider: null,
    llm_model: null,
    llm_warning: null,
    app_version: '0.1.0',
    storage_version: 1,
  };
}

describe('decodePromptRunRow', () => {
  it('decodes a valid database row into camelCase shape', () => {
    const row = decodePromptRunRow(validDbRow());
    expect(row.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.model).toBe('flux');
    expect(row.normalizedBy).toBe('deterministic');
    expect(row.positivePrompt).toContain('confident young woman');
    expect(row.llmProvider).toBeNull();
    expect(row.appVersion).toBe('0.1.0');
    expect(row.storageVersion).toBe(1);
  });

  it('decodes an LLM-normalized row with provider and model', () => {
    const raw = {
      ...validDbRow(),
      normalized_by: 'llm',
      llm_provider: 'openai',
      llm_model: 'openai/gpt-5.4',
      llm_warning: null,
    };
    const row = decodePromptRunRow(raw);
    expect(row.normalizedBy).toBe('llm');
    expect(row.llmProvider).toBe('openai');
    expect(row.llmModel).toBe('openai/gpt-5.4');
  });

  it('decodes a row with an LLM warning (deterministic fallback)', () => {
    const raw = {
      ...validDbRow(),
      normalized_by: 'deterministic',
      llm_warning: 'LLM timeout after 15000ms',
    };
    const row = decodePromptRunRow(raw);
    expect(row.normalizedBy).toBe('deterministic');
    expect(row.llmWarning).toBe('LLM timeout after 15000ms');
  });

  it('throws on missing id', () => {
    const raw = { ...validDbRow(), id: undefined };
    expect(() => decodePromptRunRow(raw)).toThrow();
  });

  it('throws on invalid uuid', () => {
    const raw = { ...validDbRow(), id: 'not-a-uuid' };
    expect(() => decodePromptRunRow(raw)).toThrow();
  });

  it('throws on invalid normalized_by value', () => {
    const raw = { ...validDbRow(), normalized_by: 'manual' };
    expect(() => decodePromptRunRow(raw)).toThrow();
  });

  it('throws when positive_prompt is missing', () => {
    const raw = { ...validDbRow(), positive_prompt: undefined };
    expect(() => decodePromptRunRow(raw)).toThrow();
  });

  it('coerces a date string into a Date object', () => {
    const row = decodePromptRunRow(validDbRow());
    expect(row.createdAt).toEqual(new Date('2026-03-09T12:00:00.000Z'));
  });

  it('does not expose aspect_ratio, width, or height on decoded row', () => {
    const row = decodePromptRunRow(validDbRow());
    const keys = Object.keys(row);
    expect(keys).not.toContain('aspectRatio');
    expect(keys).not.toContain('aspect_ratio');
    expect(keys).not.toContain('width');
    expect(keys).not.toContain('height');
  });

  it('decodes a row where optional fields are empty strings', () => {
    const raw = {
      ...validDbRow(),
      style: '',
      scene: '',
      mood: '',
      composition: '',
      lighting: '',
      camera_lens: '',
    };
    const row = decodePromptRunRow(raw);
    expect(row.style).toBe('');
    expect(row.scene).toBe('');
    expect(row.mood).toBe('');
    expect(row.composition).toBe('');
    expect(row.lighting).toBe('');
    expect(row.cameraLens).toBe('');
  });
});

describe('decodePromptRunSummary', () => {
  it('returns a summary with a short preview', () => {
    const summary = decodePromptRunSummary(validDbRow());
    expect(summary.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(summary.model).toBe('flux');
    expect(summary.normalizedBy).toBe('deterministic');
    expect(summary.positivePromptPreview.length).toBeLessThanOrEqual(80);
  });

  it('truncates long positive prompts with an ellipsis', () => {
    const raw = {
      ...validDbRow(),
      positive_prompt: 'A '.repeat(100),
    };
    const summary = decodePromptRunSummary(raw);
    expect(summary.positivePromptPreview.length).toBe(80);
    expect(summary.positivePromptPreview.endsWith('…')).toBe(true);
  });

  it('does not truncate short prompts', () => {
    const raw = {
      ...validDbRow(),
      positive_prompt: 'Short prompt',
    };
    const summary = decodePromptRunSummary(raw);
    expect(summary.positivePromptPreview).toBe('Short prompt');
  });
});
