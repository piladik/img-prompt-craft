import type { PromptRunSummary, PromptRunRow } from '../../storage/types.js';

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function modeLabel(normalizedBy: 'deterministic' | 'llm'): string {
  return normalizedBy === 'llm' ? 'LLM' : 'Det';
}

export function formatHistoryListItem(summary: PromptRunSummary, index: number): string {
  const ts = formatTimestamp(summary.createdAt);
  const mode = modeLabel(summary.normalizedBy);
  return `${index + 1}. [${ts}] ${summary.model} (${mode}) — ${summary.positivePromptPreview}`;
}

export function printHistoryList(summaries: PromptRunSummary[]): void {
  console.log('\n── Prompt History ───────────────────────');
  for (let i = 0; i < summaries.length; i++) {
    console.log(`  ${formatHistoryListItem(summaries[i], i)}`);
  }
  console.log('─────────────────────────────────────────\n');
}

export function printHistoryDetail(row: PromptRunRow): void {
  const ts = formatTimestamp(row.createdAt);
  const mode = row.normalizedBy === 'llm' ? 'LLM' : 'Deterministic';

  console.log('\n── Prompt Run Detail ────────────────────');
  console.log(`  ID:             ${row.id}`);
  console.log(`  Created:        ${ts}`);
  console.log(`  Model:          ${row.model}`);
  console.log(`  Mode:           ${mode}`);
  console.log('─────────────────────────────────────────');

  console.log('\n── Selections ──────────────────────────');
  console.log(`  Type:           ${row.type}`);
  console.log(`  Style:          ${row.style}`);
  console.log(`  Subject:        ${row.subject}`);
  console.log(`  Scene:          ${row.scene}`);
  console.log(`  Mood:           ${row.mood}`);
  console.log(`  Aspect Ratio:   ${row.aspectRatio}`);
  console.log(`  Composition:    ${row.composition}`);
  console.log(`  Lighting:       ${row.lighting}`);
  console.log(`  Camera / Lens:  ${row.cameraLens}`);
  console.log('─────────────────────────────────────────');

  console.log('\n── Positive Prompt ──────────────────────');
  console.log(`  ${row.positivePrompt}`);
  console.log('─────────────────────────────────────────');

  console.log('\n── Negative Prompt ──────────────────────');
  console.log(`  ${row.negativePrompt || 'None'}`);
  console.log('─────────────────────────────────────────');

  console.log('\n── Dimensions ──────────────────────────');
  console.log(`  ${row.width} × ${row.height}`);
  console.log('─────────────────────────────────────────');

  if (row.llmWarning) {
    console.log('\n── LLM Warning ─────────────────────────');
    console.log(`  ${row.llmWarning}`);
    console.log('─────────────────────────────────────────');
  }

  console.log('');
}

export function printHistoryEmpty(): void {
  console.log('\n── Prompt History ───────────────────────');
  console.log('  No saved prompts yet.');
  console.log('  Generate a prompt first, then come back to view history.');
  console.log('─────────────────────────────────────────\n');
}
