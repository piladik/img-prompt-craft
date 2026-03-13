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
  const lines = [
    `Original prompt: ${deterministicPositivePrompt}`,
    '',
    'User selections:',
    `- Subject: ${intermediate.subject}`,
  ];

  if (intermediate.style) lines.push(`- Style: ${intermediate.style}`);
  if (intermediate.scene) lines.push(`- Scene: ${intermediate.scene}`);
  if (intermediate.mood) lines.push(`- Mood: ${intermediate.mood}`);
  if (intermediate.composition) lines.push(`- Composition: ${intermediate.composition}`);
  if (intermediate.lighting) lines.push(`- Lighting: ${intermediate.lighting}`);
  if (intermediate.cameraLens) lines.push(`- Camera/Lens: ${intermediate.cameraLens}`);

  return lines.join('\n');
}
