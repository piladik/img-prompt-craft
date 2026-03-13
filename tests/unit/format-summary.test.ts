import { describe, it, expect } from 'vitest';
import { formatSummary } from '../../src/cli/confirmation.js';
import type { LabelLookupMap } from '../../src/cli/confirmation.js';
import {
  typeOptions,
  modelOptions,
  styleOptions,
  subjectOptions,
  sceneOptions,
  moodOptions,
  compositionOptions,
  lightingOptions,
  cameraLensOptions,
  negativePromptOptions,
} from '../../src/config/index.js';
import type { RawAnswers } from '../../src/cli/types.js';
import type { OptionalFieldId } from '../../src/cli/optional-fields.js';

const lookup: LabelLookupMap = {
  type: typeOptions,
  model: modelOptions,
  style: styleOptions,
  subject: subjectOptions,
  scene: sceneOptions,
  mood: moodOptions,
  composition: compositionOptions,
  lighting: lightingOptions,
  cameraLens: cameraLensOptions,
  negativePrompt: negativePromptOptions,
};

const ALL_OPTIONAL_IDS: OptionalFieldId[] = [
  'style', 'scene', 'mood', 'composition', 'lighting', 'cameraLens', 'negativePrompt',
];

function answersWithAllOptionals(): RawAnswers {
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
    selectedOptionalInputs: ALL_OPTIONAL_IDS,
  };
}

function requiredOnlyAnswers(): RawAnswers {
  return {
    type: 'image',
    model: 'flux',
    subject: 'young-woman',
    selectedOptionalInputs: [],
  };
}

describe('formatSummary', () => {
  describe('with all optional inputs selected', () => {
    it('includes required field labels', () => {
      const summary = formatSummary(answersWithAllOptionals(), lookup);
      expect(summary).toContain('Image');
      expect(summary).toContain('Flux');
      expect(summary).toContain('Young Woman');
    });

    it('includes selected optional field labels', () => {
      const summary = formatSummary(answersWithAllOptionals(), lookup);
      expect(summary).toContain('Cinematic Realism');
      expect(summary).toContain('Modern City Street');
      expect(summary).toContain('Confident');
      expect(summary).toContain('Medium Shot');
      expect(summary).toContain('Golden Hour Sunlight');
      expect(summary).toContain('85mm Portrait Lens');
    });

    it('shows negative prompt labels joined by commas', () => {
      const summary = formatSummary(answersWithAllOptionals(), lookup);
      expect(summary).toContain('Blurry, Bad Anatomy');
    });

    it('does not show Aspect Ratio', () => {
      const summary = formatSummary(answersWithAllOptionals(), lookup);
      expect(summary).not.toContain('Aspect Ratio');
    });

    it('includes all expected section labels', () => {
      const summary = formatSummary(answersWithAllOptionals(), lookup);
      expect(summary).toContain('Type:');
      expect(summary).toContain('Model:');
      expect(summary).toContain('Subject:');
      expect(summary).toContain('Style:');
      expect(summary).toContain('Scene:');
      expect(summary).toContain('Mood:');
      expect(summary).toContain('Composition:');
      expect(summary).toContain('Lighting:');
      expect(summary).toContain('Camera / Lens:');
      expect(summary).toContain('Negative:');
    });

    it('produces one line per required field plus selected optionals', () => {
      const summary = formatSummary(answersWithAllOptionals(), lookup);
      const lines = summary.split('\n');
      expect(lines).toHaveLength(10);
    });
  });

  describe('with required-only answers (no optional selections)', () => {
    it('shows only required fields', () => {
      const summary = formatSummary(requiredOnlyAnswers(), lookup);
      expect(summary).toContain('Type:');
      expect(summary).toContain('Model:');
      expect(summary).toContain('Subject:');
    });

    it('does not show optional field labels', () => {
      const summary = formatSummary(requiredOnlyAnswers(), lookup);
      expect(summary).not.toContain('Style:');
      expect(summary).not.toContain('Scene:');
      expect(summary).not.toContain('Mood:');
      expect(summary).not.toContain('Composition:');
      expect(summary).not.toContain('Lighting:');
      expect(summary).not.toContain('Camera / Lens:');
      expect(summary).not.toContain('Negative:');
    });

    it('produces exactly 3 lines', () => {
      const summary = formatSummary(requiredOnlyAnswers(), lookup);
      const lines = summary.split('\n');
      expect(lines).toHaveLength(3);
    });
  });

  describe('with a subset of optional inputs', () => {
    it('shows only the selected optional fields', () => {
      const answers: RawAnswers = {
        ...requiredOnlyAnswers(),
        mood: 'confident',
        scene: 'modern-city-street',
        selectedOptionalInputs: ['scene', 'mood'],
      };
      const summary = formatSummary(answers, lookup);
      expect(summary).toContain('Scene:');
      expect(summary).toContain('Modern City Street');
      expect(summary).toContain('Mood:');
      expect(summary).toContain('Confident');
      expect(summary).not.toContain('Style:');
      expect(summary).not.toContain('Composition:');
    });

    it('produces required lines plus selected optional lines', () => {
      const answers: RawAnswers = {
        ...requiredOnlyAnswers(),
        mood: 'confident',
        scene: 'modern-city-street',
        selectedOptionalInputs: ['scene', 'mood'],
      };
      const summary = formatSummary(answers, lookup);
      const lines = summary.split('\n');
      expect(lines).toHaveLength(5);
    });
  });

  describe('negative prompt edge cases', () => {
    it('shows None when negative prompt is selected but empty', () => {
      const answers: RawAnswers = {
        ...requiredOnlyAnswers(),
        negativePrompt: [],
        selectedOptionalInputs: ['negativePrompt'],
      };
      const summary = formatSummary(answers, lookup);
      expect(summary).toContain('None');
    });
  });

  describe('fallback behavior', () => {
    it('falls back to raw value when label not found', () => {
      const answers: RawAnswers = {
        ...answersWithAllOptionals(),
        style: 'unknown-style',
      };
      const summary = formatSummary(answers, lookup);
      expect(summary).toContain('unknown-style');
    });
  });

  describe('backward compatibility (no selectedOptionalInputs)', () => {
    it('shows only required fields when selectedOptionalInputs is undefined', () => {
      const answers: RawAnswers = {
        type: 'image',
        model: 'flux',
        style: 'cinematic-realism',
        subject: 'young-woman',
        scene: 'modern-city-street',
        mood: 'confident',
        composition: 'medium-shot',
        lighting: 'golden-hour-sunlight',
        cameraLens: '85mm-portrait-lens',
        negativePrompt: ['blurry'],
      };
      const summary = formatSummary(answers, lookup);
      expect(summary).toContain('Type:');
      expect(summary).toContain('Model:');
      expect(summary).toContain('Subject:');
      expect(summary).not.toContain('Style:');
      const lines = summary.split('\n');
      expect(lines).toHaveLength(3);
    });
  });
});
