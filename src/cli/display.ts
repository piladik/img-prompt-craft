import type { NormalizedOutput } from '../normalization/types.js';
import type { IntermediatePrompt } from '../domain/schema.js';
import type { GenerationError } from '../normalization/generate.js';

export function printGenerationResult(output: NormalizedOutput): void {
  console.log('\n── Positive Prompt ──────────────────────');
  console.log(`  ${output.positivePrompt}`);
  console.log('─────────────────────────────────────────');

  console.log('\n── Negative Prompt ──────────────────────');
  console.log(`  ${output.negativePrompt || 'None'}`);
  console.log('─────────────────────────────────────────');

  console.log('\n── Dimensions ──────────────────────────');
  console.log(`  ${output.width} × ${output.height}`);
  console.log('─────────────────────────────────────────\n');
}

export function printDebugOutput(intermediate: IntermediatePrompt, output: NormalizedOutput): void {
  console.log('\n── Debug: Intermediate Schema ───────────');
  console.log(JSON.stringify(intermediate, null, 2));
  console.log('─────────────────────────────────────────');

  console.log('\n── Debug: Normalized Output ─────────────');
  console.log(JSON.stringify(output, null, 2));
  console.log('─────────────────────────────────────────\n');
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
