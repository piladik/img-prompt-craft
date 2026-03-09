import type { RawAnswers } from '../cli/types.js';
import { mapAnswersToSchema } from '../domain/map-answers.js';
import type { IntermediatePrompt } from '../domain/schema.js';
import { loadModelConfig } from '../models/load-model-config.js';
import { adaptToModel } from './adapt.js';
import type { NormalizedOutput } from './types.js';

export interface GenerationSuccess {
  success: true;
  intermediate: IntermediatePrompt;
  output: NormalizedOutput;
}

export interface GenerationError {
  success: false;
  stage: 'mapping' | 'model-loading' | 'adaptation';
  error: string;
  details?: string[];
}

export type GenerationResult = GenerationSuccess | GenerationError;

export async function generatePrompt(
  answers: RawAnswers,
  modelsDir: string,
): Promise<GenerationResult> {
  const mapped = mapAnswersToSchema(answers);
  if (!mapped.success) {
    return {
      success: false,
      stage: 'mapping',
      error: mapped.error,
      details: mapped.issues,
    };
  }

  const loaded = await loadModelConfig(mapped.data.model, modelsDir);
  if (!loaded.success) {
    return {
      success: false,
      stage: 'model-loading',
      error: loaded.error,
    };
  }

  try {
    const output = adaptToModel(mapped.data, loaded.config);
    return {
      success: true,
      intermediate: mapped.data,
      output,
    };
  } catch (err) {
    return {
      success: false,
      stage: 'adaptation',
      error: err instanceof Error ? err.message : 'Unknown adaptation error',
    };
  }
}
