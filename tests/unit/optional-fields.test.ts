import { describe, it, expect } from 'vitest';
import {
  OPTIONAL_FIELD_IDS,
  OPTIONAL_FIELDS,
  isOptionalFieldId,
  validateAndOrderOptionalFields,
  type OptionalFieldId,
} from '../../src/cli/optional-fields.js';

describe('OPTIONAL_FIELD_IDS', () => {
  it('contains the expected seven optional fields in canonical order', () => {
    expect(OPTIONAL_FIELD_IDS).toEqual([
      'style',
      'scene',
      'mood',
      'composition',
      'lighting',
      'cameraLens',
      'negativePrompt',
    ]);
  });

  it('has no duplicates', () => {
    const unique = new Set(OPTIONAL_FIELD_IDS);
    expect(unique.size).toBe(OPTIONAL_FIELD_IDS.length);
  });
});

describe('OPTIONAL_FIELDS', () => {
  it('has one definition per id', () => {
    expect(OPTIONAL_FIELDS).toHaveLength(OPTIONAL_FIELD_IDS.length);
  });

  it('ids match OPTIONAL_FIELD_IDS in order', () => {
    expect(OPTIONAL_FIELDS.map((f) => f.id)).toEqual([...OPTIONAL_FIELD_IDS]);
  });

  it('every definition has a non-empty label', () => {
    for (const field of OPTIONAL_FIELDS) {
      expect(field.label.trim()).not.toBe('');
    }
  });
});

describe('isOptionalFieldId', () => {
  it.each(OPTIONAL_FIELD_IDS as unknown as string[])('returns true for known id "%s"', (id) => {
    expect(isOptionalFieldId(id)).toBe(true);
  });

  it('returns false for unknown ids', () => {
    expect(isOptionalFieldId('aspectRatio')).toBe(false);
    expect(isOptionalFieldId('width')).toBe(false);
    expect(isOptionalFieldId('')).toBe(false);
    expect(isOptionalFieldId('STYLE')).toBe(false);
  });
});

describe('validateAndOrderOptionalFields', () => {
  it('returns an empty array when no fields are selected', () => {
    expect(validateAndOrderOptionalFields([])).toEqual([]);
  });

  it('returns a single-element array for one selection', () => {
    expect(validateAndOrderOptionalFields(['mood'])).toEqual(['mood']);
  });

  it('returns selections in canonical order regardless of input order', () => {
    const scrambled: string[] = ['negativePrompt', 'lighting', 'style', 'mood'];
    expect(validateAndOrderOptionalFields(scrambled)).toEqual([
      'style',
      'mood',
      'lighting',
      'negativePrompt',
    ]);
  });

  it('returns all ids in canonical order when all are selected', () => {
    const reversed = [...OPTIONAL_FIELD_IDS].reverse();
    expect(validateAndOrderOptionalFields(reversed)).toEqual([...OPTIONAL_FIELD_IDS]);
  });

  it('deduplicates silently and preserves canonical order', () => {
    const withDupes: string[] = ['scene', 'scene', 'mood', 'scene'];
    expect(validateAndOrderOptionalFields(withDupes)).toEqual(['scene', 'mood']);
  });

  it('throws on an unknown field id', () => {
    expect(() => validateAndOrderOptionalFields(['aspectRatio'])).toThrow(
      'Unknown optional field id: "aspectRatio"',
    );
  });

  it('throws on an empty-string id', () => {
    expect(() => validateAndOrderOptionalFields([''])).toThrow(
      'Unknown optional field id: ""',
    );
  });

  it('throws when valid and invalid ids are mixed', () => {
    expect(() => validateAndOrderOptionalFields(['mood', 'unknown', 'style'])).toThrow(
      'Unknown optional field id: "unknown"',
    );
  });

  it('return type is OptionalFieldId[]', () => {
    const result: OptionalFieldId[] = validateAndOrderOptionalFields(['composition']);
    expect(result).toEqual(['composition']);
  });
});
