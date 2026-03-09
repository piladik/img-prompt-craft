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

export function mapAnswersToSchema(answers: RawAnswers): MapResult | MapError {
  const promptIntent = buildPromptIntent({
    style: answers.style,
    subject: answers.subject,
    scene: answers.scene,
    mood: answers.mood,
    composition: answers.composition,
    lighting: answers.lighting,
    cameraLens: answers.cameraLens,
  });

  const raw = {
    type: answers.type.trim(),
    model: answers.model.trim(),
    style: answers.style.trim(),
    subject: answers.subject.trim(),
    scene: answers.scene.trim(),
    mood: answers.mood.trim(),
    aspectRatio: answers.aspectRatio.trim(),
    composition: answers.composition.trim(),
    lighting: answers.lighting.trim(),
    cameraLens: answers.cameraLens.trim(),
    negativePrompt: answers.negativePrompt.map((v) => v.trim()),
    promptIntent,
    metadata: {
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
    },
  };

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
