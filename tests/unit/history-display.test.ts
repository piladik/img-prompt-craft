import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatHistoryListItem,
  printHistoryList,
  printHistoryDetail,
  printHistoryEmpty,
} from '../../src/cli/history/index.js';
import type { PromptRunSummary, PromptRunRow } from '../../src/storage/types.js';

let logged: string[];

beforeEach(() => {
  logged = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logged.push(args.map(String).join(' '));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function sampleSummary(overrides?: Partial<PromptRunSummary>): PromptRunSummary {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createdAt: new Date('2026-03-09T12:00:00.000Z'),
    model: 'flux',
    normalizedBy: 'deterministic',
    positivePromptPreview: 'A confident young woman walking through a city',
    ...overrides,
  };
}

function sampleRow(overrides?: Partial<PromptRunRow>): PromptRunRow {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createdAt: new Date('2026-03-09T12:00:00.000Z'),
    type: 'image',
    model: 'flux',
    style: 'cinematic-realism',
    subject: 'young-woman',
    scene: 'modern-city-street',
    mood: 'confident',
    aspectRatio: '16:9',
    composition: 'medium-shot',
    lighting: 'golden-hour-sunlight',
    cameraLens: '85mm-portrait-lens',
    normalizedBy: 'deterministic',
    positivePrompt: 'A confident young woman walking through a modern city street',
    negativePrompt: 'blurry, bad-anatomy',
    width: 1344,
    height: 768,
    llmProvider: null,
    llmModel: null,
    llmWarning: null,
    appVersion: '0.1.0',
    storageVersion: 1,
    ...overrides,
  };
}

describe('formatHistoryListItem', () => {
  it('formats a deterministic summary with 1-based index', () => {
    const line = formatHistoryListItem(sampleSummary(), 0);
    expect(line).toContain('1.');
    expect(line).toContain('flux');
    expect(line).toContain('(Det)');
    expect(line).toContain('A confident young woman');
  });

  it('formats an LLM summary', () => {
    const line = formatHistoryListItem(sampleSummary({ normalizedBy: 'llm' }), 2);
    expect(line).toContain('3.');
    expect(line).toContain('(LLM)');
  });

  it('includes the prompt preview', () => {
    const line = formatHistoryListItem(
      sampleSummary({ positivePromptPreview: 'Short preview' }),
      0,
    );
    expect(line).toContain('Short preview');
  });
});

describe('printHistoryList', () => {
  it('prints a header, each summary, and a footer', () => {
    const summaries = [sampleSummary(), sampleSummary({ model: 'sdxl', normalizedBy: 'llm' })];
    printHistoryList(summaries);

    const output = logged.join('\n');
    expect(output).toContain('Prompt History');
    expect(output).toContain('flux');
    expect(output).toContain('sdxl');
    expect(output).toContain('(LLM)');
  });

  it('prints one line per summary', () => {
    const summaries = [sampleSummary(), sampleSummary(), sampleSummary()];
    printHistoryList(summaries);

    const itemLines = logged.filter((l) => l.includes('flux'));
    expect(itemLines.length).toBe(3);
  });
});

describe('printHistoryDetail', () => {
  it('prints all selection fields', () => {
    printHistoryDetail(sampleRow());
    const output = logged.join('\n');

    expect(output).toContain('cinematic-realism');
    expect(output).toContain('young-woman');
    expect(output).toContain('modern-city-street');
    expect(output).toContain('confident');
    expect(output).toContain('16:9');
    expect(output).toContain('medium-shot');
    expect(output).toContain('golden-hour-sunlight');
    expect(output).toContain('85mm-portrait-lens');
  });

  it('prints positive and negative prompts', () => {
    printHistoryDetail(sampleRow());
    const output = logged.join('\n');

    expect(output).toContain('A confident young woman walking through a modern city street');
    expect(output).toContain('blurry, bad-anatomy');
  });

  it('prints dimensions', () => {
    printHistoryDetail(sampleRow());
    const output = logged.join('\n');

    expect(output).toContain('1344 × 768');
  });

  it('shows "None" when negative prompt is empty', () => {
    printHistoryDetail(sampleRow({ negativePrompt: '' }));
    const output = logged.join('\n');

    expect(output).toContain('None');
  });

  it('shows Deterministic mode label', () => {
    printHistoryDetail(sampleRow({ normalizedBy: 'deterministic' }));
    const output = logged.join('\n');

    expect(output).toContain('Deterministic');
  });

  it('shows LLM mode label', () => {
    printHistoryDetail(sampleRow({ normalizedBy: 'llm' }));
    const output = logged.join('\n');

    expect(output).toContain('LLM');
  });

  it('shows LLM warning when present', () => {
    printHistoryDetail(sampleRow({ llmWarning: 'LLM timeout after 15000ms' }));
    const output = logged.join('\n');

    expect(output).toContain('LLM Warning');
    expect(output).toContain('LLM timeout after 15000ms');
  });

  it('does not show LLM warning section when null', () => {
    printHistoryDetail(sampleRow({ llmWarning: null }));
    const output = logged.join('\n');

    expect(output).not.toContain('LLM Warning');
  });
});

describe('printHistoryEmpty', () => {
  it('prints empty-state message', () => {
    printHistoryEmpty();
    const output = logged.join('\n');

    expect(output).toContain('No saved prompts yet');
    expect(output).toContain('Generate a prompt first');
  });
});
