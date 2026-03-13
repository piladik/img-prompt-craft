import type { NormalizedOutput } from '../normalization/types.js';
import type { IntermediatePrompt } from '../domain/schema.js';
import type { GenerationError, GenerationSuccess } from '../normalization/generate.js';

export function printGenerationResult(result: GenerationSuccess): void {
  const modeLabel = result.normalizedBy === 'llm' ? 'LLM' : 'Deterministic';
  console.log(`\n── Positive Prompt (${modeLabel}) ──────────────`);
  console.log(`  ${result.output.positivePrompt}`);
  console.log('─────────────────────────────────────────');

  console.log('\n── Negative Prompt ──────────────────────');
  console.log(`  ${result.output.negativePrompt || 'None'}`);
  console.log('─────────────────────────────────────────\n');

  if (result.llmWarning) {
    console.log('  LLM normalization unavailable, using deterministic prompt.');
  }
}

export function printDebugOutput(
  result: GenerationSuccess,
  deterministicPrompt?: string,
): void {
  console.log('\n── Debug: Intermediate Schema ───────────');
  console.log(JSON.stringify(result.intermediate, null, 2));
  console.log('─────────────────────────────────────────');

  console.log('\n── Debug: Normalized Output ─────────────');
  console.log(JSON.stringify(result.output, null, 2));
  console.log('─────────────────────────────────────────');

  if (result.normalizedBy === 'llm' && deterministicPrompt) {
    console.log('\n── Debug: Original Deterministic Prompt ─');
    console.log(`  ${deterministicPrompt}`);
    console.log('─────────────────────────────────────────');
  }

  if (result.llmWarning) {
    console.log(`\n── Debug: LLM Warning ──────────────────`);
    console.log(`  ${result.llmWarning}`);
    console.log('─────────────────────────────────────────');
  }

  console.log('');
}

export function printGenerationError(error: GenerationError): void {
  console.log('\n── Generation Failed ────────────────────');
  console.log(`  Stage: ${error.stage}`);
  console.log(`  Error: ${error.error}`);
  if (error.details && error.details.length > 0) {
    console.log('  Details:');
    for (const detail of error.details) {
      console.log(`    - ${detail}`);
    }
  }
  console.log('─────────────────────────────────────────\n');
}
