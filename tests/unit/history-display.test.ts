import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatHistoryListItem,
  printHistoryList,
  printHistoryDetail,
  printHistoryEmpty,
  wrapText,
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
    composition: 'medium-shot',
    lighting: 'golden-hour-sunlight',
    cameraLens: '85mm-portrait-lens',
    normalizedBy: 'deterministic',
    positivePrompt: 'A confident young woman walking through a modern city street',
    negativePrompt: 'blurry, bad-anatomy',
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
  it('prints required fields and populated optional fields', () => {
    printHistoryDetail(sampleRow());
    const output = logged.join('\n');

    expect(output).toContain('image');
    expect(output).toContain('young-woman');
    expect(output).toContain('cinematic-realism');
    expect(output).toContain('modern-city-street');
    expect(output).toContain('confident');
    expect(output).toContain('medium-shot');
    expect(output).toContain('golden-hour-sunlight');
    expect(output).toContain('85mm-portrait-lens');
  });

  it('omits optional fields that are empty strings', () => {
    printHistoryDetail(sampleRow({
      style: '',
      scene: '',
      mood: '',
      composition: '',
      lighting: '',
      cameraLens: '',
    }));
    const output = logged.join('\n');

    expect(output).toContain('image');
    expect(output).toContain('young-woman');
    expect(output).not.toContain('Style:');
    expect(output).not.toContain('Scene:');
    expect(output).not.toContain('Mood:');
    expect(output).not.toContain('Composition:');
    expect(output).not.toContain('Lighting:');
    expect(output).not.toContain('Camera / Lens:');
  });

  it('shows only a subset of optional fields when others are empty', () => {
    printHistoryDetail(sampleRow({
      style: '',
      scene: 'forest-clearing',
      mood: 'peaceful',
      composition: '',
      lighting: '',
      cameraLens: '',
    }));
    const output = logged.join('\n');

    expect(output).toContain('Scene:');
    expect(output).toContain('forest-clearing');
    expect(output).toContain('Mood:');
    expect(output).toContain('peaceful');
    expect(output).not.toContain('Style:');
    expect(output).not.toContain('Composition:');
    expect(output).not.toContain('Lighting:');
    expect(output).not.toContain('Camera / Lens:');
  });

  it('never shows aspect_ratio, width, or height', () => {
    printHistoryDetail(sampleRow());
    const output = logged.join('\n');

    expect(output).not.toMatch(/aspect.?ratio/i);
    expect(output).not.toMatch(/\bwidth\b/i);
    expect(output).not.toMatch(/\bheight\b/i);
  });

  it('prints positive and negative prompts', () => {
    printHistoryDetail(sampleRow());
    const output = logged.join('\n');

    expect(output).toContain('A confident young woman walking through a modern city street');
    expect(output).toContain('blurry, bad-anatomy');
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

describe('wrapText', () => {
  it('returns a single line when text fits within maxWidth', () => {
    const lines = wrapText('short text', 76, '  ');
    expect(lines).toEqual(['  short text']);
  });

  it('wraps text at word boundaries when it exceeds maxWidth', () => {
    const text = 'one two three four five six';
    const lines = wrapText(text, 15, '  ');
    for (const line of lines) {
      expect(line.startsWith('  ')).toBe(true);
    }
    const reassembled = lines.map((l) => l.slice(2)).join(' ');
    expect(reassembled).toBe(text);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('keeps a single word longer than maxWidth on its own line', () => {
    const longWord = 'a'.repeat(100);
    const lines = wrapText(longWord, 76, '  ');
    expect(lines).toEqual([`  ${longWord}`]);
  });

  it('returns "None" for an empty string', () => {
    expect(wrapText('', 76, '  ')).toEqual(['  None']);
  });

  it('returns "None" for a whitespace-only string', () => {
    expect(wrapText('   \t  ', 76, '  ')).toEqual(['  None']);
  });

  it('preserves every word from the original text', () => {
    const text = 'masterful cinematic composition, soft golden-hour light, depth of field, dramatic shadows, modern urban architecture';
    const lines = wrapText(text, 40, '  ');
    const reassembled = lines.map((l) => l.slice(2)).join(' ');
    expect(reassembled).toBe(text);
  });
});

const LONG_POSITIVE = [
  'masterful cinematic portrait of a confident young woman',
  'walking through a rain-soaked modern city street at golden hour,',
  'soft volumetric light diffusing through scattered clouds,',
  'shallow depth of field with bokeh highlights on wet pavement,',
  'dramatic leading lines from converging skyscrapers,',
  'rich color grading with teal shadows and warm amber highlights,',
  'ultra-detailed skin texture and natural hair movement,',
  'wearing a tailored dark blazer with subtle fabric wrinkles,',
  'environmental reflections in puddles and glass storefronts,',
  'photorealistic rendering, 8k resolution, professional photography',
].join(' ');

const LONG_NEGATIVE = [
  'blurry, out of focus, bad anatomy, distorted face,',
  'extra limbs, fused fingers, low quality, pixelated,',
  'watermark, signature, text overlay, cropped frame,',
  'oversaturated neon colors, flat lighting, plastic skin,',
  'unrealistic proportions, uncanny valley expression',
].join(' ');

describe('printHistoryDetail — full prompt visibility', () => {
  it('shows the full positive prompt with no truncation', () => {
    printHistoryDetail(sampleRow({ positivePrompt: LONG_POSITIVE }));
    const output = logged.join('\n');

    for (const word of LONG_POSITIVE.split(/\s+/)) {
      expect(output).toContain(word);
    }
  });

  it('shows the full negative prompt with no truncation', () => {
    printHistoryDetail(sampleRow({ negativePrompt: LONG_NEGATIVE }));
    const output = logged.join('\n');

    for (const word of LONG_NEGATIVE.split(/\s+/)) {
      expect(output).toContain(word);
    }
  });

  it('uses "Full Positive Prompt" and "Full Negative Prompt" section labels', () => {
    printHistoryDetail(sampleRow());
    const output = logged.join('\n');

    expect(output).toContain('Full Positive Prompt');
    expect(output).toContain('Full Negative Prompt');
  });

  it('wraps long positive prompts into multiple output lines', () => {
    printHistoryDetail(sampleRow({ positivePrompt: LONG_POSITIVE }));

    const promptLines = logged.filter((l) => {
      const trimmed = l.trim();
      return trimmed.length > 0 && !trimmed.startsWith('──') && LONG_POSITIVE.split(/\s+/).some((w) => trimmed.includes(w));
    });
    const inSection = promptLines.filter((l) => !l.includes(':') || l.trim().includes(','));
    expect(inSection.length).toBeGreaterThan(1);
  });
});
