import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { generatePrompt } from '../../src/normalization/index.js';
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

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

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

const STYLE_VALUES = styleOptions.map((o) => o.value);
const SUBJECT_VALUES = subjectOptions.map((o) => o.value);
const SCENE_VALUES = sceneOptions.map((o) => o.value);
const MOOD_VALUES = moodOptions.map((o) => o.value);
const RATIO_VALUES = aspectRatioOptions.map((o) => o.value);
const COMP_VALUES = compositionOptions.map((o) => o.value);
const LIGHT_VALUES = lightingOptions.map((o) => o.value);
const LENS_VALUES = cameraLensOptions.map((o) => o.value);

function makeAnswers(overrides?: Partial<RawAnswers>): RawAnswers {
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
    ...overrides,
  };
}

describe('full pipeline: successful run', () => {
  it('generates output that matches the documented example', async () => {
    const result = await generatePrompt(makeAnswers(), MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.output.positivePrompt).toBe(
      'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism',
    );
    expect(result.output.negativePrompt).toBe('blurry, bad anatomy, deformed hands');
    expect(result.output.width).toBe(1344);
    expect(result.output.height).toBe(768);
  });

  it('summary contains human-friendly labels', () => {
    const summary = formatSummary(makeAnswers(), lookup);
    expect(summary).toContain('Cinematic Realism');
    expect(summary).toContain('Young Woman');
    expect(summary).toContain('Modern City Street');
    expect(summary).toContain('Confident');
    expect(summary).toContain('Medium Shot');
    expect(summary).toContain('Golden Hour Sunlight');
    expect(summary).toContain('85mm Portrait Lens');
    expect(summary).toContain('Blurry, Bad Anatomy, Deformed Hands');
  });

  it('intermediate schema has valid metadata', async () => {
    const result = await generatePrompt(makeAnswers(), MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.intermediate.metadata.appVersion).toBe('0.1.0');
    expect(result.intermediate.metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('intermediate schema has a non-empty promptIntent', async () => {
    const result = await generatePrompt(makeAnswers(), MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.intermediate.promptIntent.length).toBeGreaterThan(20);
  });
});

describe('full pipeline: every valid combination produces output', () => {
  for (const style of STYLE_VALUES) {
    for (const subject of SUBJECT_VALUES) {
      it(`${style} + ${subject}`, async () => {
        const result = await generatePrompt(makeAnswers({ style, subject }), MODELS_DIR);
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.output.positivePrompt.length).toBeGreaterThan(10);
      });
    }
  }
});

describe('full pipeline: every aspect ratio maps to valid dimensions', () => {
  for (const aspectRatio of RATIO_VALUES) {
    it(`aspect ratio ${aspectRatio}`, async () => {
      const result = await generatePrompt(makeAnswers({ aspectRatio }), MODELS_DIR);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.output.width).toBeGreaterThan(0);
      expect(result.output.height).toBeGreaterThan(0);
    });
  }
});

describe('full pipeline: every scene option', () => {
  for (const scene of SCENE_VALUES) {
    it(`scene: ${scene}`, async () => {
      const result = await generatePrompt(makeAnswers({ scene }), MODELS_DIR);
      expect(result.success).toBe(true);
    });
  }
});

describe('full pipeline: every mood option', () => {
  for (const mood of MOOD_VALUES) {
    it(`mood: ${mood}`, async () => {
      const result = await generatePrompt(makeAnswers({ mood }), MODELS_DIR);
      expect(result.success).toBe(true);
    });
  }
});

describe('full pipeline: every composition option', () => {
  for (const composition of COMP_VALUES) {
    it(`composition: ${composition}`, async () => {
      const result = await generatePrompt(makeAnswers({ composition }), MODELS_DIR);
      expect(result.success).toBe(true);
    });
  }
});

describe('full pipeline: every lighting option', () => {
  for (const lighting of LIGHT_VALUES) {
    it(`lighting: ${lighting}`, async () => {
      const result = await generatePrompt(makeAnswers({ lighting }), MODELS_DIR);
      expect(result.success).toBe(true);
    });
  }
});

describe('full pipeline: every camera lens option', () => {
  for (const cameraLens of LENS_VALUES) {
    it(`camera lens: ${cameraLens}`, async () => {
      const result = await generatePrompt(makeAnswers({ cameraLens }), MODELS_DIR);
      expect(result.success).toBe(true);
    });
  }
});

describe('full pipeline: negative prompt edge cases', () => {
  it('works with no negative prompt items', async () => {
    const result = await generatePrompt(makeAnswers({ negativePrompt: [] }), MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt).toBe('');
  });

  it('works with all 10 negative prompt items', async () => {
    const allNeg = negativePromptOptions.map((o) => o.value);
    const result = await generatePrompt(makeAnswers({ negativePrompt: allNeg }), MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt.split(', ')).toHaveLength(10);
  });

  it('works with a single negative prompt item', async () => {
    const result = await generatePrompt(
      makeAnswers({ negativePrompt: ['extra-fingers'] }),
      MODELS_DIR,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt).toBe('extra fingers');
  });
});
