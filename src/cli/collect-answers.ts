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
} from '../config/index.js';
import type { PresetOption } from '../config/index.js';
import {
  askType,
  askModel,
  askSubject,
  askStyle,
  askScene,
  askMood,
  askComposition,
  askLighting,
  askCameraLens,
  askNegativePrompt,
  askOptionalInputs,
} from './prompts.js';
import type { RawAnswers } from './types.js';
import type { OptionalFieldId } from './optional-fields.js';

interface OptionalPromptEntry {
  options: PresetOption[];
  ask: (options: PresetOption[]) => Promise<string>;
  assign: (answers: Partial<RawAnswers>, value: string) => void;
}

interface OptionalPromptEntryMulti {
  options: PresetOption[];
  ask: (options: PresetOption[]) => Promise<string[]>;
  assign: (answers: Partial<RawAnswers>, value: string[]) => void;
}

type OptionalPromptMapping = Record<
  Exclude<OptionalFieldId, 'negativePrompt'>,
  OptionalPromptEntry
> & {
  negativePrompt: OptionalPromptEntryMulti;
};

const optionalPromptMap: OptionalPromptMapping = {
  style: {
    options: styleOptions,
    ask: askStyle,
    assign: (a, v) => { a.style = v; },
  },
  scene: {
    options: sceneOptions,
    ask: askScene,
    assign: (a, v) => { a.scene = v; },
  },
  mood: {
    options: moodOptions,
    ask: askMood,
    assign: (a, v) => { a.mood = v; },
  },
  composition: {
    options: compositionOptions,
    ask: askComposition,
    assign: (a, v) => { a.composition = v; },
  },
  lighting: {
    options: lightingOptions,
    ask: askLighting,
    assign: (a, v) => { a.lighting = v; },
  },
  cameraLens: {
    options: cameraLensOptions,
    ask: askCameraLens,
    assign: (a, v) => { a.cameraLens = v; },
  },
  negativePrompt: {
    options: negativePromptOptions,
    ask: askNegativePrompt,
    assign: (a, v) => { a.negativePrompt = v; },
  },
};

export async function collectAnswers(): Promise<RawAnswers> {
  const type = await askType(typeOptions);
  const model = await askModel(modelOptions);
  const subject = await askSubject(subjectOptions);

  const selectedOptionalInputs = await askOptionalInputs();

  const answers: RawAnswers = {
    type,
    model,
    subject,
    selectedOptionalInputs,
  };

  for (const fieldId of selectedOptionalInputs) {
    const entry = optionalPromptMap[fieldId];
    if (fieldId === 'negativePrompt') {
      const multi = entry as OptionalPromptEntryMulti;
      const value = await multi.ask(multi.options);
      multi.assign(answers, value);
    } else {
      const single = entry as OptionalPromptEntry;
      const value = await single.ask(single.options);
      single.assign(answers, value);
    }
  }

  return answers;
}

export { optionalPromptMap };
