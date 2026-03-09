import { describe, it, expect } from 'vitest';
import { formatSummary } from '../../src/cli/confirmation.js';
import {
  typeOptions,
  modelOptions,
  styleOptions,
  subjectOptions,
  sceneOptions,
  moodOptions,
  aspectRatioOptions,
  compositionOptions,
  lightingOptions,
  cameraLensOptions,
  negativePromptOptions,
} from '../../src/config/index.js';
import type { RawAnswers } from '../../src/cli/types.js';

const lookup = {
  type: typeOptions,
  model: modelOptions,
  style: styleOptions,
  subject: subjectOptions,
  scene: sceneOptions,
  mood: moodOptions,
  aspectRatio: aspectRatioOptions,
  composition: compositionOptions,
  lighting: lightingOptions,
  cameraLens: cameraLensOptions,
  negativePrompt: negativePromptOptions,
};

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
    negativePrompt: ['blurry', 'bad-anatomy'],
  };
}

describe('formatSummary', () => {
  it('includes all field labels', () => {
    const summary = formatSummary(validAnswers(), lookup);
    expect(summary).toContain('Image');
    expect(summary).toContain('Flux');
    expect(summary).toContain('Cinematic Realism');
    expect(summary).toContain('Young Woman');
    expect(summary).toContain('Modern City Street');
    expect(summary).toContain('Confident');
    expect(summary).toContain('16:9 (Landscape)');
    expect(summary).toContain('Medium Shot');
    expect(summary).toContain('Golden Hour Sunlight');
    expect(summary).toContain('85mm Portrait Lens');
  });

  it('shows negative prompt labels joined by commas', () => {
    const summary = formatSummary(validAnswers(), lookup);
    expect(summary).toContain('Blurry, Bad Anatomy');
  });

  it('shows None when no negative prompts selected', () => {
    const answers = { ...validAnswers(), negativePrompt: [] };
    const summary = formatSummary(answers, lookup);
    expect(summary).toContain('None');
  });

  it('falls back to raw value when label not found', () => {
    const answers = { ...validAnswers(), style: 'unknown-style' };
    const summary = formatSummary(answers, lookup);
    expect(summary).toContain('unknown-style');
  });

  it('includes all expected section labels', () => {
    const summary = formatSummary(validAnswers(), lookup);
    expect(summary).toContain('Type:');
    expect(summary).toContain('Model:');
    expect(summary).toContain('Style:');
    expect(summary).toContain('Subject:');
    expect(summary).toContain('Scene:');
    expect(summary).toContain('Mood:');
    expect(summary).toContain('Aspect Ratio:');
    expect(summary).toContain('Composition:');
    expect(summary).toContain('Lighting:');
    expect(summary).toContain('Camera / Lens:');
    expect(summary).toContain('Negative:');
  });

  it('produces one line per field', () => {
    const summary = formatSummary(validAnswers(), lookup);
    const lines = summary.split('\n');
    expect(lines).toHaveLength(11);
  });
});
