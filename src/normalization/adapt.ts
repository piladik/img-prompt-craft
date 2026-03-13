import type { IntermediatePrompt } from '../domain/schema.js';
import type { ModelConfig } from '../models/model-config-schema.js';
import type { NormalizedOutput } from './types.js';

function humanize(value: string): string {
  return value.replace(/-/g, ' ');
}

function capitalize(text: string): string {
  if (text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

export function adaptToModel(
  intermediate: IntermediatePrompt,
  config: ModelConfig,
): NormalizedOutput {
  const vars: Record<string, string> = {
    style: humanize(intermediate.style ?? ''),
    subject: humanize(intermediate.subject),
    scene: humanize(intermediate.scene ?? ''),
    mood: humanize(intermediate.mood ?? ''),
    composition: capitalize(humanize(intermediate.composition ?? '')),
    lighting: humanize(intermediate.lighting ?? ''),
    cameraLens: humanize(intermediate.cameraLens ?? ''),
  };

  const positivePrompt = fillTemplate(config.positivePromptTemplate, vars);

  const negativeItems = (intermediate.negativePrompt ?? []).map(humanize);
  const negativePrompt =
    negativeItems.length > 0
      ? config.defaultNegativePrefix + negativeItems.join(config.negativePromptSeparator)
      : '';

  return {
    positivePrompt,
    negativePrompt,
  };
}
