import type { RawAnswers } from '../cli/types.js';
import type { GenerationSuccess } from '../normalization/generate.js';
import type { LlmConfig } from '../llm/types.js';
import type { PromptRunInsert } from './types.js';

const STORAGE_VERSION = 1;

export interface MapToInsertOptions {
  answers: RawAnswers;
  result: GenerationSuccess;
  appVersion: string;
  llmConfig?: LlmConfig;
}

export function mapToPromptRunInsert(options: MapToInsertOptions): PromptRunInsert {
  const { answers, result, appVersion, llmConfig } = options;

  return {
    type: answers.type,
    model: answers.model,
    style: answers.style ?? '',
    subject: answers.subject,
    scene: answers.scene ?? '',
    mood: answers.mood ?? '',
    composition: answers.composition ?? '',
    lighting: answers.lighting ?? '',
    cameraLens: answers.cameraLens ?? '',
    normalizedBy: result.normalizedBy,
    positivePrompt: result.output.positivePrompt,
    negativePrompt: result.output.negativePrompt,
    llmProvider: result.normalizedBy === 'llm' && llmConfig ? extractProvider(llmConfig.model) : null,
    llmModel: result.normalizedBy === 'llm' && llmConfig ? llmConfig.model : null,
    llmWarning: result.llmWarning ?? null,
    appVersion,
    storageVersion: STORAGE_VERSION,
  };
}

function extractProvider(llmModelId: string): string {
  const slashIndex = llmModelId.indexOf('/');
  return slashIndex > 0 ? llmModelId.slice(0, slashIndex) : llmModelId;
}
