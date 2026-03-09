import { select } from '@inquirer/prompts';
import type pg from 'pg';
import { listRecentPromptRuns, getPromptRunById } from '../../storage/index.js';
import type { PromptRunSummary, PromptRunRow } from '../../storage/types.js';
import type { SkippedRow } from '../../storage/index.js';
import { printHistoryList, printHistoryDetail, printHistoryEmpty } from './display.js';

type DetailAction = 'back-to-history' | 'exit';

interface HistoryFlowOptions {
  debug?: boolean;
}

async function askSelectPromptRun(summaries: PromptRunSummary[]): Promise<string | 'exit'> {
  const choices = summaries.map((s) => {
    const ts = s.createdAt.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const mode = s.normalizedBy === 'llm' ? 'LLM' : 'Det';
    const preview =
      s.positivePromptPreview.length > 50
        ? s.positivePromptPreview.slice(0, 49) + '…'
        : s.positivePromptPreview;
    return {
      name: `[${ts}] ${s.model} (${mode}) — ${preview}`,
      value: s.id,
    };
  });

  choices.push({ name: 'Exit', value: 'exit' });

  return select({ message: 'Select a prompt run to view details:', choices });
}

async function askDetailAction(): Promise<DetailAction> {
  return select({
    message: 'What next?',
    choices: [
      { name: 'Back to history', value: 'back-to-history' as const },
      { name: 'Exit', value: 'exit' as const },
    ],
  });
}

function printSkippedRows(skipped: SkippedRow[], debug: boolean): void {
  if (skipped.length === 0) return;
  console.log(`  ${skipped.length} saved record(s) could not be loaded and were skipped.`);
  if (debug) {
    for (const s of skipped) {
      console.log(`    - row ${s.index}${s.id ? ` (id: ${s.id})` : ''}: ${s.reason}`);
    }
  }
}

export async function runHistoryFlow(client: pg.Client, options?: HistoryFlowOptions): Promise<void> {
  const debug = options?.debug ?? false;
  let browsing = true;

  while (browsing) {
    const listResult = await listRecentPromptRuns(client);

    if (!listResult.success) {
      console.error(`Failed to load history: ${listResult.error}`);
      return;
    }

    const { summaries, skipped } = listResult.data;

    if (summaries.length === 0 && skipped.length === 0) {
      printHistoryEmpty();
      return;
    }

    if (summaries.length === 0) {
      console.log('\n  All saved records are corrupted and could not be loaded.');
      printSkippedRows(skipped, debug);
      return;
    }

    printHistoryList(summaries);
    printSkippedRows(skipped, debug);

    const selected = await askSelectPromptRun(summaries);

    if (selected === 'exit') {
      return;
    }

    const detailResult = await getPromptRunById(client, selected);

    if (!detailResult.success) {
      console.error(`  Failed to load prompt run: ${detailResult.error}`);
      continue;
    }

    if (!detailResult.data) {
      console.log('  Prompt run not found — it may have been deleted.');
      continue;
    }

    printHistoryDetail(detailResult.data);

    const action = await askDetailAction();

    if (action === 'exit') {
      return;
    }
  }
}
