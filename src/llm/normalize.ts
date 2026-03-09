import type { ModelConfig } from '../models/model-config-schema.js';
import type { IntermediatePrompt } from '../domain/schema.js';
import type { LlmClient, LlmConfig, LlmNormalizationResult } from './types.js';
import { buildSystemPrompt, buildUserPrompt } from './build-system-prompt.js';
import { validateLlmResponse } from './response-validation.js';

const MAX_ATTEMPTS = 2;

export async function normalizeWithLlm(
  intermediate: IntermediatePrompt,
  deterministicPrompt: string,
  modelConfig: ModelConfig,
  llmConfig: LlmConfig,
  client: LlmClient,
  modelsDir: string,
): Promise<LlmNormalizationResult> {
  const systemPrompt = await buildSystemPrompt(modelConfig, llmConfig, modelsDir);
  const userPrompt = buildUserPrompt(deterministicPrompt, intermediate);

  let lastReason = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await client.complete(systemPrompt, userPrompt);
      const validation = validateLlmResponse(raw, intermediate, llmConfig.maxPromptLength);

      if (validation.success) {
        return { success: true, rewrittenPrompt: validation.cleanedPrompt };
      }

      lastReason = validation.reason;
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'Unknown LLM error';
    }
  }

  return { success: false, reason: lastReason };
}
