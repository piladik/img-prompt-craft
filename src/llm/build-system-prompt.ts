import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ModelConfig } from '../models/model-config-schema.js';
import type { IntermediatePrompt } from '../domain/schema.js';
import type { LlmConfig } from './types.js';

export async function buildSystemPrompt(
  modelConfig: ModelConfig,
  llmConfig: LlmConfig,
  modelsDir: string,
): Promise<string> {
  const templatePath = join(modelsDir, modelConfig.id, 'llm-prompt.txt');
  const template = await readFile(templatePath, 'utf-8');

  return template
    .replace(/\{model\.label\}/g, modelConfig.label)
    .replace(/\{model\.promptGuidance\}/g, modelConfig.promptGuidance)
    .replace(/\{maxLength\}/g, String(llmConfig.maxPromptLength));
}

export function buildUserPrompt(
  deterministicPositivePrompt: string,
  intermediate: IntermediatePrompt,
): string {
  return [
    `Original prompt: ${deterministicPositivePrompt}`,
    '',
    'User selections:',
    `- Style: ${intermediate.style}`,
    `- Subject: ${intermediate.subject}`,
    `- Scene: ${intermediate.scene}`,
    `- Mood: ${intermediate.mood}`,
    `- Composition: ${intermediate.composition}`,
    `- Lighting: ${intermediate.lighting}`,
    `- Camera/Lens: ${intermediate.cameraLens}`,
  ].join('\n');
}
