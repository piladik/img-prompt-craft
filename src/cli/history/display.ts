import type { PromptRunSummary, PromptRunRow } from '../../storage/types.js';

const PROMPT_LINE_WIDTH = 76;
const PROMPT_INDENT = '  ';

export function wrapText(text: string, maxWidth: number = PROMPT_LINE_WIDTH, indent: string = PROMPT_INDENT): string[] {
  if (!text) return [`${indent}None`];

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [`${indent}None`];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += ' ' + word;
    } else {
      lines.push(`${indent}${current}`);
      current = word;
    }
  }

  if (current.length > 0) {
    lines.push(`${indent}${current}`);
  }

  return lines;
}

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
  console.log(`  Subject:        ${row.subject}`);

  const optionalSelections: [string, string][] = [
    ['Style', row.style],
    ['Scene', row.scene],
    ['Mood', row.mood],
    ['Composition', row.composition],
    ['Lighting', row.lighting],
    ['Camera / Lens', row.cameraLens],
  ];

  for (const [label, value] of optionalSelections) {
    if (value) {
      console.log(`  ${label}:${' '.repeat(14 - label.length)}${value}`);
    }
  }

  console.log('─────────────────────────────────────────');

  console.log('\n── Full Positive Prompt ─────────────────');
  for (const line of wrapText(row.positivePrompt)) {
    console.log(line);
  }
  console.log('─────────────────────────────────────────');

  console.log('\n── Full Negative Prompt ─────────────────');
  for (const line of wrapText(row.negativePrompt)) {
    console.log(line);
  }
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
