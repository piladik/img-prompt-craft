import { select, checkbox } from '@inquirer/prompts';
import type { PresetOption } from '../config/index.js';

function toChoices(options: PresetOption[]) {
  return options.map((o) => ({ name: o.label, value: o.value }));
}

export async function askType(options: PresetOption[]): Promise<string> {
  return select({ message: 'Prompt type:', choices: toChoices(options) });
}

export async function askModel(options: PresetOption[]): Promise<string> {
  return select({ message: 'Model:', choices: toChoices(options) });
}

export async function askStyle(options: PresetOption[]): Promise<string> {
  return select({ message: 'Style:', choices: toChoices(options) });
}

export async function askSubject(options: PresetOption[]): Promise<string> {
  return select({ message: 'Subject:', choices: toChoices(options) });
}

export async function askScene(options: PresetOption[]): Promise<string> {
  return select({ message: 'Scene:', choices: toChoices(options) });
}

export async function askMood(options: PresetOption[]): Promise<string> {
  return select({ message: 'Mood:', choices: toChoices(options) });
}

export async function askAspectRatio(options: PresetOption[]): Promise<string> {
  return select({ message: 'Aspect ratio:', choices: toChoices(options) });
}

export async function askComposition(options: PresetOption[]): Promise<string> {
  return select({ message: 'Composition:', choices: toChoices(options) });
}

export async function askLighting(options: PresetOption[]): Promise<string> {
  return select({ message: 'Lighting:', choices: toChoices(options) });
}

export async function askCameraLens(options: PresetOption[]): Promise<string> {
  return select({ message: 'Camera / lens:', choices: toChoices(options) });
}

export async function askNegativePrompt(options: PresetOption[]): Promise<string[]> {
  return checkbox({
    message: 'Negative prompt (optional, press Enter to skip):',
    choices: toChoices(options),
    required: false,
  });
}
