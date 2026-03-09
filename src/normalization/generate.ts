import type { RawAnswers } from '../cli/types.js';
import { mapAnswersToSchema } from '../domain/map-answers.js';
import type { IntermediatePrompt } from '../domain/schema.js';
import { loadModelConfig } from '../models/load-model-config.js';
import { adaptToModel } from './adapt.js';
import type { NormalizedOutput } from './types.js';
import type { LlmClient, LlmConfig } from '../llm/types.js';
import { normalizeWithLlm } from '../llm/normalize.js';

export interface LlmOptions {
  config: LlmConfig;
  client: LlmClient;
}

export interface GenerationSuccess {
  success: true;
  intermediate: IntermediatePrompt;
  output: NormalizedOutput;
  normalizedBy: 'deterministic' | 'llm';
  llmWarning?: string;
}

export interface GenerationError {
  success: false;
  stage: 'mapping' | 'model-loading' | 'adaptation' | 'llm-normalization';
  error: string;
  details?: string[];
}

export type GenerationResult = GenerationSuccess | GenerationError;

export async function generatePrompt(
  answers: RawAnswers,
  modelsDir: string,
  llmOptions?: LlmOptions,
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

  let output: NormalizedOutput;
  try {
    output = adaptToModel(mapped.data, loaded.config);
  } catch (err) {
    return {
      success: false,
      stage: 'adaptation',
      error: err instanceof Error ? err.message : 'Unknown adaptation error',
    };
  }

  if (!llmOptions) {
    return {
      success: true,
      intermediate: mapped.data,
      output,
      normalizedBy: 'deterministic',
    };
  }

  const llmResult = await normalizeWithLlm(
    mapped.data,
    output.positivePrompt,
    loaded.config,
    llmOptions.config,
    llmOptions.client,
    modelsDir,
  );

  if (llmResult.success) {
    return {
      success: true,
      intermediate: mapped.data,
      output: { ...output, positivePrompt: llmResult.rewrittenPrompt },
      normalizedBy: 'llm',
    };
  }

  return {
    success: true,
    intermediate: mapped.data,
    output,
    normalizedBy: 'deterministic',
    llmWarning: llmResult.reason,
  };
}
