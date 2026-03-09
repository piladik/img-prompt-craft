import { describe, it, expect } from 'vitest';
import { validateLlmResponse } from '../../src/llm/index.js';
import type { IntermediatePrompt } from '../../src/domain/schema.js';

const baseIntermediate: IntermediatePrompt = {
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

const MAX_LENGTH = 500;

describe('validateLlmResponse', () => {
  describe('valid responses', () => {
    it('accepts a well-formed response referencing the subject', () => {
      const response =
        'A confident young woman stands on a modern city street bathed in golden hour sunlight, captured in a medium shot with an 85mm portrait lens in cinematic realism style.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.cleanedPrompt).toBe(response);
    });

    it('trims whitespace from valid response', () => {
      const response = '  A beautiful woman walking down the street.  ';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.cleanedPrompt).toBe('A beautiful woman walking down the street.');
    });

    it('accepts response using synonym "female"', () => {
      const response = 'A confident female figure on a city street at golden hour.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(true);
    });

    it('accepts response using synonym "lady"', () => {
      const response = 'A young lady walks through the golden-lit city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(true);
    });

    it('accepts response for young-man subject', () => {
      const manIntermediate = { ...baseIntermediate, subject: 'young-man' as const };
      const response = 'A confident young man stands on a modern city street at golden hour.';
      const result = validateLlmResponse(response, manIntermediate, MAX_LENGTH);
      expect(result.success).toBe(true);
    });

    it('accepts response using "guy" for young-man subject', () => {
      const manIntermediate = { ...baseIntermediate, subject: 'young-man' as const };
      const response = 'A cool guy leans against a wall on a city street bathed in sunset light.';
      const result = validateLlmResponse(response, manIntermediate, MAX_LENGTH);
      expect(result.success).toBe(true);
    });
  });

  describe('empty response', () => {
    it('rejects empty string', () => {
      const result = validateLlmResponse('', baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('empty');
    });

    it('rejects whitespace-only string', () => {
      const result = validateLlmResponse('   \n\t  ', baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('empty');
    });
  });

  describe('response exceeding max length', () => {
    it('rejects response longer than maxPromptLength', () => {
      const longResponse = 'A woman '.repeat(100);
      const result = validateLlmResponse(longResponse, baseIntermediate, 50);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('max length');
    });

    it('accepts response exactly at max length', () => {
      const response = 'A woman on the street.';
      const result = validateLlmResponse(response, baseIntermediate, response.length);
      expect(result.success).toBe(true);
    });
  });

  describe('response missing subject reference', () => {
    it('rejects response without any subject keyword for young-woman', () => {
      const response = 'A beautiful sunset over a modern city street with golden light.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('subject');
    });

    it('rejects response without any subject keyword for young-man', () => {
      const manIntermediate = { ...baseIntermediate, subject: 'young-man' as const };
      const response = 'A beautiful sunset over a modern city street with golden light.';
      const result = validateLlmResponse(response, manIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('subject');
    });

    it('subject check is case-insensitive', () => {
      const response = 'A WOMAN stands confidently on the city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(true);
    });
  });

  describe('response containing metadata or instructions', () => {
    it('rejects response with markdown code fences', () => {
      const response = '```\nA woman on a city street.\n```';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response with markdown heading', () => {
      const response = '## Rewritten Prompt\nA woman on a city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response with bold markdown', () => {
      const response = 'A **beautiful** woman on a city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response starting with "Here\'s"', () => {
      const response = "Here's the rewritten prompt: A woman on a city street.";
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response starting with "Here is"', () => {
      const response = 'Here is the rewritten prompt: A woman on a city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response starting with "Sure,"', () => {
      const response = 'Sure, here you go: A woman on a city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response starting with "I have"', () => {
      const response = 'I have rewritten the prompt. A woman on a city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response with "Rewritten prompt:" prefix', () => {
      const response = 'Rewritten prompt: A woman on a city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response containing JSON-like structure', () => {
      const response = '{"rewrittenPrompt": "A woman on a city street."}';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });

    it('rejects response with "Note:" prefix', () => {
      const response = 'Note: I changed some details. A woman on a city street.';
      const result = validateLlmResponse(response, baseIntermediate, MAX_LENGTH);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.reason).toContain('metadata');
    });
  });
});
