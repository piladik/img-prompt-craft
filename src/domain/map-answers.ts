import { intermediatePromptSchema, type IntermediatePrompt } from './schema.js';
import { buildPromptIntent } from './prompt-intent.js';
import type { RawAnswers } from '../cli/types.js';

const APP_VERSION = '0.1.0';

export interface MapResult {
  success: true;
  data: IntermediatePrompt;
}

export interface MapError {
  success: false;
  error: string;
  issues: string[];
}

function trimIfPresent(value: string | undefined): string | undefined {
  return value !== undefined ? value.trim() : undefined;
}

export function mapAnswersToSchema(answers: RawAnswers): MapResult | MapError {
  const promptIntent = buildPromptIntent({
    subject: answers.subject,
    style: answers.style,
    scene: answers.scene,
    mood: answers.mood,
    composition: answers.composition,
    lighting: answers.lighting,
    cameraLens: answers.cameraLens,
  });

  const raw: Record<string, unknown> = {
    type: answers.type.trim(),
    model: answers.model.trim(),
    subject: answers.subject.trim(),
    promptIntent,
    metadata: {
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
    },
  };

  const style = trimIfPresent(answers.style);
  if (style !== undefined) raw.style = style;

  const scene = trimIfPresent(answers.scene);
  if (scene !== undefined) raw.scene = scene;

  const mood = trimIfPresent(answers.mood);
  if (mood !== undefined) raw.mood = mood;

  const composition = trimIfPresent(answers.composition);
  if (composition !== undefined) raw.composition = composition;

  const lighting = trimIfPresent(answers.lighting);
  if (lighting !== undefined) raw.lighting = lighting;

  const cameraLens = trimIfPresent(answers.cameraLens);
  if (cameraLens !== undefined) raw.cameraLens = cameraLens;

  if (answers.negativePrompt !== undefined) {
    raw.negativePrompt = answers.negativePrompt.map((v) => v.trim());
  }

  const result = intermediatePromptSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );

  return {
    success: false,
    error: 'Validation failed when mapping answers to intermediate schema.',
    issues,
  };
}
