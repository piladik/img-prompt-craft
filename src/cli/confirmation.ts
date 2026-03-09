import { select } from '@inquirer/prompts';
import type { PresetOption } from '../config/index.js';
import type { RawAnswers, ConfirmationAction, PostGenerationAction } from './types.js';

interface LabelLookupMap {
  type: PresetOption[];
  model: PresetOption[];
  style: PresetOption[];
  subject: PresetOption[];
  scene: PresetOption[];
  mood: PresetOption[];
  aspectRatio: PresetOption[];
  composition: PresetOption[];
  lighting: PresetOption[];
  cameraLens: PresetOption[];
  negativePrompt: PresetOption[];
}

function findLabel(options: PresetOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function formatSummary(answers: RawAnswers, lookup: LabelLookupMap): string {
  const lines = [
    `  Type:           ${findLabel(lookup.type, answers.type)}`,
    `  Model:          ${findLabel(lookup.model, answers.model)}`,
    `  Style:          ${findLabel(lookup.style, answers.style)}`,
    `  Subject:        ${findLabel(lookup.subject, answers.subject)}`,
    `  Scene:          ${findLabel(lookup.scene, answers.scene)}`,
    `  Mood:           ${findLabel(lookup.mood, answers.mood)}`,
    `  Aspect Ratio:   ${findLabel(lookup.aspectRatio, answers.aspectRatio)}`,
    `  Composition:    ${findLabel(lookup.composition, answers.composition)}`,
    `  Lighting:       ${findLabel(lookup.lighting, answers.lighting)}`,
    `  Camera / Lens:  ${findLabel(lookup.cameraLens, answers.cameraLens)}`,
    `  Negative:       ${answers.negativePrompt.length > 0 ? answers.negativePrompt.map((v) => findLabel(lookup.negativePrompt, v)).join(', ') : 'None'}`,
  ];
  return lines.join('\n');
}

export async function askConfirmation(
  answers: RawAnswers,
  lookup: LabelLookupMap,
): Promise<ConfirmationAction> {
  const summary = formatSummary(answers, lookup);
  console.log('\n── Your Selections ──────────────────────');
  console.log(summary);
  console.log('─────────────────────────────────────────\n');

  return select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Generate prompt', value: 'generate' as const },
      { name: 'Restart from the beginning', value: 'restart' as const },
      { name: 'Cancel and exit', value: 'cancel' as const },
    ],
  });
}

export async function askPostGeneration(): Promise<PostGenerationAction> {
  return select({
    message: 'What next?',
    choices: [
      { name: 'Generate another prompt', value: 'generate-again' as const },
      { name: 'Exit', value: 'exit' as const },
    ],
  });
}
