export type { PresetOption } from './types.js';

export { typeOptions } from './type-options.js';
export { modelOptions } from './model-options.js';
export { styleOptions } from './style-options.js';
export { subjectOptions } from './subject-options.js';
export { sceneOptions } from './scene-options.js';
export { moodOptions } from './mood-options.js';
export { aspectRatioOptions } from './aspect-ratio-options.js';
export { compositionOptions } from './composition-options.js';
export { lightingOptions } from './lighting-options.js';
export { cameraLensOptions } from './camera-lens-options.js';
export { negativePromptOptions } from './negative-prompt-options.js';

import type { PresetOption } from './types.js';

export function assertNoDuplicateValues(options: PresetOption[], groupName: string): void {
  const seen = new Set<string>();
  for (const option of options) {
    if (seen.has(option.value)) {
      throw new Error(`Duplicate value "${option.value}" in ${groupName} options`);
    }
    seen.add(option.value);
  }
}
