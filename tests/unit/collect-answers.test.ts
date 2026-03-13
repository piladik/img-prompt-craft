import { describe, it, expect } from 'vitest';
import { optionalPromptMap } from '../../src/cli/collect-answers.js';
import { OPTIONAL_FIELD_IDS, type OptionalFieldId } from '../../src/cli/optional-fields.js';

describe('optionalPromptMap', () => {
  it('has an entry for every canonical optional field id', () => {
    for (const id of OPTIONAL_FIELD_IDS) {
      expect(optionalPromptMap).toHaveProperty(id);
    }
  });

  it('has no entries for unknown field ids', () => {
    const keys = Object.keys(optionalPromptMap);
    for (const key of keys) {
      expect((OPTIONAL_FIELD_IDS as readonly string[]).includes(key)).toBe(true);
    }
  });

  it('every entry has options, ask, and assign', () => {
    for (const id of OPTIONAL_FIELD_IDS) {
      const entry = optionalPromptMap[id as Exclude<OptionalFieldId, 'negativePrompt'>];
      expect(entry).toHaveProperty('options');
      expect(entry).toHaveProperty('ask');
      expect(entry).toHaveProperty('assign');
      expect(Array.isArray(entry.options)).toBe(true);
      expect(typeof entry.ask).toBe('function');
      expect(typeof entry.assign).toBe('function');
    }
  });

  it('every entry has at least one option', () => {
    for (const id of OPTIONAL_FIELD_IDS) {
      const entry = optionalPromptMap[id as Exclude<OptionalFieldId, 'negativePrompt'>];
      expect(entry.options.length).toBeGreaterThan(0);
    }
  });

  it('iterating in OPTIONAL_FIELD_IDS order produces the stable question order', () => {
    const orderedKeys: string[] = [];
    for (const id of OPTIONAL_FIELD_IDS) {
      if (id in optionalPromptMap) {
        orderedKeys.push(id);
      }
    }
    expect(orderedKeys).toEqual([
      'style',
      'scene',
      'mood',
      'composition',
      'lighting',
      'cameraLens',
      'negativePrompt',
    ]);
  });
});
