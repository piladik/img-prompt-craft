import { describe, it, expect } from 'vitest';
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
  assertNoDuplicateValues,
  type PresetOption,
} from '../../src/config/index.js';

const allGroups: { name: string; options: PresetOption[]; expectedCount: number }[] = [
  { name: 'type', options: typeOptions, expectedCount: 1 },
  { name: 'model', options: modelOptions, expectedCount: 1 },
  { name: 'style', options: styleOptions, expectedCount: 5 },
  { name: 'subject', options: subjectOptions, expectedCount: 2 },
  { name: 'scene', options: sceneOptions, expectedCount: 5 },
  { name: 'mood', options: moodOptions, expectedCount: 5 },
  { name: 'aspectRatio', options: aspectRatioOptions, expectedCount: 5 },
  { name: 'composition', options: compositionOptions, expectedCount: 5 },
  { name: 'lighting', options: lightingOptions, expectedCount: 5 },
  { name: 'cameraLens', options: cameraLensOptions, expectedCount: 5 },
  { name: 'negativePrompt', options: negativePromptOptions, expectedCount: 10 },
];

describe('preset option groups', () => {
  for (const { name, options, expectedCount } of allGroups) {
    describe(name, () => {
      it(`has exactly ${expectedCount} option(s)`, () => {
        expect(options).toHaveLength(expectedCount);
      });

      it('has no duplicate values', () => {
        expect(() => assertNoDuplicateValues(options, name)).not.toThrow();
      });

      it('every option has a non-empty label and value', () => {
        for (const option of options) {
          expect(option.label.trim()).not.toBe('');
          expect(option.value.trim()).not.toBe('');
        }
      });

      it('values follow naming convention (lowercase, hyphens, digits, colons)', () => {
        for (const option of options) {
          expect(option.value).toMatch(/^[a-z0-9][a-z0-9:-]*$/);
        }
      });
    });
  }
});

describe('assertNoDuplicateValues', () => {
  it('throws on duplicate values', () => {
    const dupes: PresetOption[] = [
      { label: 'A', value: 'same' },
      { label: 'B', value: 'same' },
    ];
    expect(() => assertNoDuplicateValues(dupes, 'test')).toThrow(
      'Duplicate value "same" in test options',
    );
  });
});

describe('locked MVP values', () => {
  it('type includes image', () => {
    expect(typeOptions.map((o) => o.value)).toContain('image');
  });

  it('model includes flux', () => {
    expect(modelOptions.map((o) => o.value)).toContain('flux');
  });

  it('style values match roadmap', () => {
    expect(styleOptions.map((o) => o.value)).toEqual([
      'cinematic-realism',
      'fashion-editorial',
      'natural-lifestyle-photography',
      'dark-moody-portrait',
      'luxury-commercial-photo',
    ]);
  });

  it('subject values match roadmap', () => {
    expect(subjectOptions.map((o) => o.value)).toEqual(['young-woman', 'young-man']);
  });

  it('scene values match roadmap', () => {
    expect(sceneOptions.map((o) => o.value)).toEqual([
      'modern-city-street',
      'cozy-cafe-interior',
      'luxury-studio-backdrop',
      'rooftop-at-sunset',
      'minimalist-apartment-interior',
    ]);
  });

  it('mood values match roadmap', () => {
    expect(moodOptions.map((o) => o.value)).toEqual([
      'confident',
      'mysterious',
      'relaxed',
      'romantic',
      'dramatic',
    ]);
  });

  it('aspect ratio values match roadmap', () => {
    expect(aspectRatioOptions.map((o) => o.value)).toEqual([
      '1:1',
      '4:5',
      '3:4',
      '16:9',
      '9:16',
    ]);
  });

  it('composition values match roadmap', () => {
    expect(compositionOptions.map((o) => o.value)).toEqual([
      'close-up-portrait',
      'head-and-shoulders-portrait',
      'medium-shot',
      'full-body-shot',
      'candid-over-the-shoulder',
    ]);
  });

  it('lighting values match roadmap', () => {
    expect(lightingOptions.map((o) => o.value)).toEqual([
      'soft-natural-daylight',
      'golden-hour-sunlight',
      'dramatic-studio-lighting',
      'neon-night-lighting',
      'soft-window-light',
    ]);
  });

  it('camera lens values match roadmap', () => {
    expect(cameraLensOptions.map((o) => o.value)).toEqual([
      '35mm-documentary-look',
      '50mm-natural-perspective',
      '85mm-portrait-lens',
      '24mm-environmental-portrait',
      '70-200mm-compressed-fashion-look',
    ]);
  });

  it('negative prompt values match roadmap', () => {
    expect(negativePromptOptions.map((o) => o.value)).toEqual([
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
    ]);
  });
});
