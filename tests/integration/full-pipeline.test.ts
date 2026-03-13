import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { generatePrompt } from '../../src/normalization/index.js';
import { formatSummary } from '../../src/cli/confirmation.js';
import type { LabelLookupMap } from '../../src/cli/confirmation.js';
import { mapToPromptRunInsert } from '../../src/storage/mappers.js';
import { decodePromptRunRow, decodePromptRunSummary } from '../../src/storage/schema.js';
import { formatHistoryListItem, printHistoryDetail } from '../../src/cli/history/display.js';
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
import { OPTIONAL_FIELD_IDS } from '../../src/cli/optional-fields.js';

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

const lookup = {
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

const STYLE_VALUES = styleOptions.map((o) => o.value);
const SUBJECT_VALUES = subjectOptions.map((o) => o.value);
const SCENE_VALUES = sceneOptions.map((o) => o.value);
const MOOD_VALUES = moodOptions.map((o) => o.value);
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
    composition: 'medium-shot',
    lighting: 'golden-hour-sunlight',
    cameraLens: '85mm-portrait-lens',
    negativePrompt: ['blurry', 'bad-anatomy', 'deformed-hands'],
    selectedOptionalInputs: [...OPTIONAL_FIELD_IDS],
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

describe('full pipeline: minimal flow (zero optional inputs)', () => {
  const minimalAnswers: RawAnswers = {
    type: 'image',
    model: 'flux',
    subject: 'young-woman',
  };

  it('generates a coherent positive prompt with only required fields', async () => {
    const result = await generatePrompt(minimalAnswers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.positivePrompt.length).toBeGreaterThan(5);
    expect(result.output.positivePrompt.toLowerCase()).toContain('young woman');
  });

  it('produces an empty negative prompt', async () => {
    const result = await generatePrompt(minimalAnswers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.negativePrompt).toBe('');
  });

  it('intermediate schema has valid metadata', async () => {
    const result = await generatePrompt(minimalAnswers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.intermediate.metadata.appVersion).toBe('0.1.0');
    expect(result.intermediate.metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('output contains no width, height, or aspectRatio', async () => {
    const result = await generatePrompt(minimalAnswers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const outputKeys = Object.keys(result.output);
    expect(outputKeys).not.toContain('width');
    expect(outputKeys).not.toContain('height');
    expect(outputKeys).not.toContain('aspectRatio');
  });

  it('summary shows only required fields', () => {
    const summary = formatSummary(minimalAnswers, lookup);
    expect(summary).toContain('Image');
    expect(summary).toContain('Flux');
    expect(summary).toContain('Young Woman');
    expect(summary).not.toContain('Style:');
    expect(summary).not.toContain('Scene:');
    expect(summary).not.toContain('Mood:');
    expect(summary).not.toContain('Composition:');
    expect(summary).not.toContain('Lighting:');
    expect(summary).not.toContain('Camera / Lens:');
    expect(summary).not.toContain('Negative:');
    expect(summary.split('\n')).toHaveLength(3);
  });
});

describe('full pipeline: partial optional inputs (mood + scene only)', () => {
  const partialAnswers: RawAnswers = {
    type: 'image',
    model: 'flux',
    subject: 'young-man',
    mood: 'mysterious',
    scene: 'rooftop-at-sunset',
    selectedOptionalInputs: ['mood', 'scene'],
  };

  it('generates a prompt that includes selected optional fields', async () => {
    const result = await generatePrompt(partialAnswers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.positivePrompt.toLowerCase()).toContain('young man');
    expect(result.output.positivePrompt.toLowerCase()).toContain('mysterious');
    expect(result.output.positivePrompt.toLowerCase()).toContain('rooftop');
  });

  it('does not inject unselected optional fields into the prompt', async () => {
    const result = await generatePrompt(partialAnswers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.positivePrompt.toLowerCase()).not.toContain('cinematic');
    expect(result.output.positivePrompt.toLowerCase()).not.toContain('golden hour');
    expect(result.output.positivePrompt.toLowerCase()).not.toContain('85mm');
  });

  it('summary shows only required + selected optional fields', () => {
    const summary = formatSummary(partialAnswers, lookup);
    expect(summary).toContain('Image');
    expect(summary).toContain('Flux');
    expect(summary).toContain('Young Man');
    expect(summary).toContain('Scene:');
    expect(summary).toContain('Rooftop at Sunset');
    expect(summary).toContain('Mood:');
    expect(summary).toContain('Mysterious');
    expect(summary).not.toContain('Style:');
    expect(summary).not.toContain('Composition:');
    expect(summary).not.toContain('Lighting:');
    expect(summary.split('\n')).toHaveLength(5);
  });
});

describe('full pipeline: history list and detail with partial optional data', () => {
  function buildFakeDbRow(insert: ReturnType<typeof mapToPromptRunInsert>, id: string) {
    return {
      id,
      created_at: new Date().toISOString(),
      type: insert.type,
      model: insert.model,
      style: insert.style,
      subject: insert.subject,
      scene: insert.scene,
      mood: insert.mood,
      composition: insert.composition,
      lighting: insert.lighting,
      camera_lens: insert.cameraLens,
      normalized_by: insert.normalizedBy,
      positive_prompt: insert.positivePrompt,
      negative_prompt: insert.negativePrompt,
      llm_provider: insert.llmProvider,
      llm_model: insert.llmModel,
      llm_warning: insert.llmWarning,
      app_version: insert.appVersion,
      storage_version: insert.storageVersion,
    };
  }

  it('history list item formats correctly for required-only run', async () => {
    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const insert = mapToPromptRunInsert({ answers, result, appVersion: '0.1.0' });
    const fakeRow = buildFakeDbRow(insert, 'a1b2c3d4-e5f6-4890-abcd-ef1234567890');
    const summary = decodePromptRunSummary(fakeRow);

    const line = formatHistoryListItem(summary, 0);
    expect(line).toContain('flux');
    expect(line).toContain('Det');
    expect(line).not.toContain('aspect');
    expect(line).not.toContain('width');
    expect(line).not.toContain('height');
  });

  it('history list item formats correctly for partial-optional run', async () => {
    const answers: RawAnswers = {
      type: 'image',
      model: 'flux',
      subject: 'young-man',
      mood: 'mysterious',
      scene: 'rooftop-at-sunset',
      selectedOptionalInputs: ['mood', 'scene'],
    };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const insert = mapToPromptRunInsert({ answers, result, appVersion: '0.1.0' });
    const fakeRow = buildFakeDbRow(insert, 'b2c3d4e5-f6a7-4901-bcde-f12345678901');
    const summary = decodePromptRunSummary(fakeRow);

    const line = formatHistoryListItem(summary, 0);
    expect(line).toContain('flux');
    expect(line).toContain('Det');
  });

  it('history detail shows only present optional selections for required-only run', async () => {
    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const insert = mapToPromptRunInsert({ answers, result, appVersion: '0.1.0' });
    const fakeRow = buildFakeDbRow(insert, 'a1b2c3d4-e5f6-4890-abcd-ef1234567890');
    const decoded = decodePromptRunRow(fakeRow);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printHistoryDetail(decoded);
    const output = logSpy.mock.calls.map((c) => c[0]).join('\n');
    logSpy.mockRestore();

    expect(output).toContain('Type:');
    expect(output).toContain('Subject:');
    expect(output).not.toContain('Style:');
    expect(output).not.toContain('Scene:');
    expect(output).not.toContain('Mood:');
    expect(output).not.toContain('Composition:');
    expect(output).not.toContain('Lighting:');
    expect(output).not.toContain('Camera / Lens:');
    expect(output).not.toMatch(/\bwidth\b/i);
    expect(output).not.toMatch(/\bheight\b/i);
    expect(output).not.toMatch(/\baspect.ratio\b/i);
  });

  it('history detail shows only mood and scene for partial-optional run', async () => {
    const answers: RawAnswers = {
      type: 'image',
      model: 'flux',
      subject: 'young-man',
      mood: 'mysterious',
      scene: 'rooftop-at-sunset',
      selectedOptionalInputs: ['mood', 'scene'],
    };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const insert = mapToPromptRunInsert({ answers, result, appVersion: '0.1.0' });
    const fakeRow = buildFakeDbRow(insert, 'b2c3d4e5-f6a7-4901-bcde-f12345678901');
    const decoded = decodePromptRunRow(fakeRow);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printHistoryDetail(decoded);
    const output = logSpy.mock.calls.map((c) => c[0]).join('\n');
    logSpy.mockRestore();

    expect(output).toContain('Mood:');
    expect(output).toContain('mysterious');
    expect(output).toContain('Scene:');
    expect(output).toContain('rooftop-at-sunset');
    expect(output).not.toContain('Style:');
    expect(output).not.toContain('Composition:');
    expect(output).not.toContain('Lighting:');
    expect(output).not.toContain('Camera / Lens:');
  });
});

describe('full pipeline: storage round-trip with minimal optional data', () => {
  it('generates, maps to insert, and decodes from DB shape with required-only answers', async () => {
    const answers: RawAnswers = { type: 'image', model: 'flux', subject: 'young-woman' };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const insert = mapToPromptRunInsert({ answers, result, appVersion: '0.1.0' });
    expect(insert.style).toBe('');
    expect(insert.scene).toBe('');
    expect(insert.mood).toBe('');
    expect(insert.composition).toBe('');
    expect(insert.lighting).toBe('');
    expect(insert.cameraLens).toBe('');

    const keys = Object.keys(insert);
    expect(keys).not.toContain('aspectRatio');
    expect(keys).not.toContain('width');
    expect(keys).not.toContain('height');

    const fakeDbRow = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      created_at: new Date().toISOString(),
      type: insert.type,
      model: insert.model,
      style: insert.style,
      subject: insert.subject,
      scene: insert.scene,
      mood: insert.mood,
      composition: insert.composition,
      lighting: insert.lighting,
      camera_lens: insert.cameraLens,
      normalized_by: insert.normalizedBy,
      positive_prompt: insert.positivePrompt,
      negative_prompt: insert.negativePrompt,
      llm_provider: insert.llmProvider,
      llm_model: insert.llmModel,
      llm_warning: insert.llmWarning,
      app_version: insert.appVersion,
      storage_version: insert.storageVersion,
    };

    const decoded = decodePromptRunRow(fakeDbRow);
    expect(decoded.type).toBe('image');
    expect(decoded.model).toBe('flux');
    expect(decoded.subject).toBe('young-woman');
    expect(decoded.style).toBe('');
    expect(decoded.scene).toBe('');
    expect(decoded.positivePrompt.length).toBeGreaterThan(0);

    const decodedKeys = Object.keys(decoded);
    expect(decodedKeys).not.toContain('aspectRatio');
    expect(decodedKeys).not.toContain('width');
    expect(decodedKeys).not.toContain('height');
  });

  it('round-trips a partial-optional flow (mood + scene only)', async () => {
    const answers: RawAnswers = {
      type: 'image',
      model: 'flux',
      subject: 'young-man',
      mood: 'mysterious',
      scene: 'rooftop-at-sunset',
      selectedOptionalInputs: ['mood', 'scene'],
    };
    const result = await generatePrompt(answers, MODELS_DIR);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const insert = mapToPromptRunInsert({ answers, result, appVersion: '0.1.0' });
    expect(insert.mood).toBe('mysterious');
    expect(insert.scene).toBe('rooftop-at-sunset');
    expect(insert.style).toBe('');

    const fakeDbRow = {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      created_at: new Date().toISOString(),
      type: insert.type,
      model: insert.model,
      style: insert.style,
      subject: insert.subject,
      scene: insert.scene,
      mood: insert.mood,
      composition: insert.composition,
      lighting: insert.lighting,
      camera_lens: insert.cameraLens,
      normalized_by: insert.normalizedBy,
      positive_prompt: insert.positivePrompt,
      negative_prompt: insert.negativePrompt,
      llm_provider: insert.llmProvider,
      llm_model: insert.llmModel,
      llm_warning: insert.llmWarning,
      app_version: insert.appVersion,
      storage_version: insert.storageVersion,
    };

    const decoded = decodePromptRunRow(fakeDbRow);
    expect(decoded.mood).toBe('mysterious');
    expect(decoded.scene).toBe('rooftop-at-sunset');
    expect(decoded.style).toBe('');
    expect(decoded.composition).toBe('');
  });
});
