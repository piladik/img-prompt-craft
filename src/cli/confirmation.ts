import { select } from '@inquirer/prompts';
import type { PresetOption } from '../config/index.js';
import type { RawAnswers, ConfirmationAction, PostGenerationAction } from './types.js';
import type { OptionalFieldId } from './optional-fields.js';

export interface LabelLookupMap {
  type: PresetOption[];
  model: PresetOption[];
  style: PresetOption[];
  subject: PresetOption[];
  scene: PresetOption[];
  mood: PresetOption[];
  composition: PresetOption[];
  lighting: PresetOption[];
  cameraLens: PresetOption[];
  negativePrompt: PresetOption[];
}

function findLabel(options: PresetOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

const optionalFieldLabels: Record<OptionalFieldId, { heading: string; lookupKey: keyof LabelLookupMap }> = {
  style:          { heading: 'Style',         lookupKey: 'style' },
  scene:          { heading: 'Scene',         lookupKey: 'scene' },
  mood:           { heading: 'Mood',          lookupKey: 'mood' },
  composition:    { heading: 'Composition',   lookupKey: 'composition' },
  lighting:       { heading: 'Lighting',      lookupKey: 'lighting' },
  cameraLens:     { heading: 'Camera / Lens', lookupKey: 'cameraLens' },
  negativePrompt: { heading: 'Negative',      lookupKey: 'negativePrompt' },
};

export function formatSummary(answers: RawAnswers, lookup: LabelLookupMap): string {
  const lines = [
    `  Type:           ${findLabel(lookup.type, answers.type)}`,
    `  Model:          ${findLabel(lookup.model, answers.model)}`,
    `  Subject:        ${findLabel(lookup.subject, answers.subject)}`,
  ];

  const selected = answers.selectedOptionalInputs ?? [];

  for (const fieldId of selected) {
    const meta = optionalFieldLabels[fieldId];
    const pad = meta.heading.length < 14
      ? ' '.repeat(14 - meta.heading.length)
      : ' ';

    if (fieldId === 'negativePrompt') {
      const items = answers.negativePrompt ?? [];
      const display = items.length > 0
        ? items.map((v) => findLabel(lookup.negativePrompt, v)).join(', ')
        : 'None';
      lines.push(`  ${meta.heading}:${pad}${display}`);
    } else {
      const value = answers[fieldId] ?? '';
      lines.push(`  ${meta.heading}:${pad}${findLabel(lookup[meta.lookupKey], value)}`);
    }
  }

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
