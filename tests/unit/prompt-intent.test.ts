import { describe, it, expect } from 'vitest';
import { buildPromptIntent } from '../../src/domain/index.js';

describe('buildPromptIntent', () => {
  it('produces a readable sentence from hyphenated values', () => {
    const result = buildPromptIntent({
      style: 'cinematic-realism',
      subject: 'young-woman',
      scene: 'modern-city-street',
      mood: 'confident',
      composition: 'medium-shot',
      lighting: 'golden-hour-sunlight',
      cameraLens: '85mm-portrait-lens',
    });

    expect(result).toBe(
      'medium shot of a confident young woman in a modern city street with golden hour sunlight shot on 85mm portrait lens in cinematic realism style',
    );
  });

  it('handles single-word values without unnecessary spaces', () => {
    const result = buildPromptIntent({
      style: 'cinematic-realism',
      subject: 'young-man',
      scene: 'rooftop-at-sunset',
      mood: 'dramatic',
      composition: 'full-body-shot',
      lighting: 'dramatic-studio-lighting',
      cameraLens: '35mm-documentary-look',
    });

    expect(result).toContain('dramatic young man');
    expect(result).toContain('rooftop at sunset');
    expect(result).toContain('full body shot');
    expect(result).not.toMatch(/  /);
  });

  it('returns a non-empty string', () => {
    const result = buildPromptIntent({
      style: 'fashion-editorial',
      subject: 'young-woman',
      scene: 'cozy-cafe-interior',
      mood: 'relaxed',
      composition: 'close-up-portrait',
      lighting: 'soft-window-light',
      cameraLens: '50mm-natural-perspective',
    });

    expect(result.length).toBeGreaterThan(0);
  });
});
