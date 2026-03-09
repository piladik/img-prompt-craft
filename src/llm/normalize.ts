import type { ModelConfig } from '../models/model-config-schema.js';
import type { IntermediatePrompt } from '../domain/schema.js';
import type { LlmClient, LlmConfig, LlmNormalizationResult } from './types.js';
import { buildSystemPrompt, buildUserPrompt } from './build-system-prompt.js';
import { validateLlmResponse } from './response-validation.js';

const MAX_ATTEMPTS = 2;

export interface NormalizeOptions {
  debug?: boolean;
}

export async function normalizeWithLlm(
  intermediate: IntermediatePrompt,
  deterministicPrompt: string,
  modelConfig: ModelConfig,
  llmConfig: LlmConfig,
  client: LlmClient,
  modelsDir: string,
  options?: NormalizeOptions,
): Promise<LlmNormalizationResult> {
  const debug = options?.debug ?? false;
  const systemPrompt = await buildSystemPrompt(modelConfig, llmConfig, modelsDir);
  const userPrompt = buildUserPrompt(deterministicPrompt, intermediate);

  if (debug) {
    console.log('\n── Debug: LLM Request ──────────────────');
    console.log(`  Model: ${llmConfig.model}`);
    console.log(`  Base URL: ${llmConfig.baseUrl}`);
    console.log(`  Timeout: ${llmConfig.timeoutMs}ms`);
    console.log(`  Max length: ${llmConfig.maxPromptLength}`);
    console.log('  System prompt:');
    console.log(indent(systemPrompt));
    console.log('  User prompt:');
    console.log(indent(userPrompt));
    console.log('─────────────────────────────────────────');
  }

  let lastReason = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await client.complete(systemPrompt, userPrompt);

      if (debug) {
        console.log(`\n── Debug: LLM Response (attempt ${attempt}) ───`);
        console.log(indent(raw));
        console.log('─────────────────────────────────────────');
      }

      const validation = validateLlmResponse(raw, intermediate, llmConfig.maxPromptLength);

      if (validation.success) {
        return { success: true, rewrittenPrompt: validation.cleanedPrompt };
      }

      lastReason = validation.reason;

      if (debug) {
        console.log(`  Validation failed: ${lastReason}`);
      }
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'Unknown LLM error';

      if (debug) {
        console.log(`\n── Debug: LLM Error (attempt ${attempt}) ────`);
        console.log(`  ${lastReason}`);
        console.log('─────────────────────────────────────────');
      }
    }
  }

  return { success: false, reason: lastReason };
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}
