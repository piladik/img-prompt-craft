export const OPTIONAL_FIELD_IDS = [
  'style',
  'scene',
  'mood',
  'composition',
  'lighting',
  'cameraLens',
  'negativePrompt',
] as const;

export type OptionalFieldId = (typeof OPTIONAL_FIELD_IDS)[number];

export interface OptionalFieldDefinition {
  id: OptionalFieldId;
  label: string;
}

export const OPTIONAL_FIELDS: readonly OptionalFieldDefinition[] = [
  { id: 'style', label: 'Style' },
  { id: 'scene', label: 'Scene' },
  { id: 'mood', label: 'Mood' },
  { id: 'composition', label: 'Composition' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'cameraLens', label: 'Camera / Lens' },
  { id: 'negativePrompt', label: 'Negative Prompt' },
] as const;

const knownIds = new Set<string>(OPTIONAL_FIELD_IDS);

/**
 * Canonical order index for each optional field id, used to re-sort
 * arbitrary selections into the stable display/question order.
 */
const orderIndex = new Map<string, number>(
  OPTIONAL_FIELD_IDS.map((id, i) => [id, i]),
);

export function isOptionalFieldId(value: string): value is OptionalFieldId {
  return knownIds.has(value);
}

/**
 * Validates and re-orders a list of selected optional field ids.
 *
 * - Rejects any id not present in the canonical list.
 * - Deduplicates silently (keeps first occurrence).
 * - Returns ids sorted in the canonical stable order.
 */
export function validateAndOrderOptionalFields(
  selected: readonly string[],
): OptionalFieldId[] {
  const seen = new Set<OptionalFieldId>();
  const result: OptionalFieldId[] = [];

  for (const id of selected) {
    if (!isOptionalFieldId(id)) {
      throw new Error(`Unknown optional field id: "${id}"`);
    }
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }

  result.sort((a, b) => (orderIndex.get(a)! - orderIndex.get(b)!));
  return result;
}
