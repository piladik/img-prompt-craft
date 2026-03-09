import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  printGenerationResult,
  printGenerationError,
  printDebugOutput,
} from '../../src/cli/display.js';
import type { NormalizedOutput } from '../../src/normalization/types.js';
import type { IntermediatePrompt } from '../../src/domain/schema.js';
import type { GenerationError, GenerationSuccess } from '../../src/normalization/generate.js';

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

const sampleOutput: NormalizedOutput = {
  positivePrompt: 'Medium shot of a confident young woman',
  negativePrompt: 'blurry, bad anatomy',
  width: 1344,
  height: 768,
};

const sampleOutputEmpty: NormalizedOutput = {
  positivePrompt: 'Close up portrait of a relaxed young man',
  negativePrompt: '',
  width: 1024,
  height: 1024,
};

const sampleIntermediate: IntermediatePrompt = {
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
  negativePrompt: ['blurry'],
  promptIntent: 'test intent',
  metadata: { createdAt: '2026-03-09T00:00:00.000Z', appVersion: '0.1.0' },
};

function makeSuccess(overrides?: Partial<GenerationSuccess>): GenerationSuccess {
  return {
    success: true,
    intermediate: sampleIntermediate,
    output: sampleOutput,
    normalizedBy: 'deterministic',
    ...overrides,
  };
}

describe('printGenerationResult', () => {
  it('prints positive prompt', () => {
    printGenerationResult(makeSuccess());
    const output = logged.join('\n');
    expect(output).toContain('Medium shot of a confident young woman');
  });

  it('prints negative prompt', () => {
    printGenerationResult(makeSuccess());
    const output = logged.join('\n');
    expect(output).toContain('blurry, bad anatomy');
  });

  it('prints dimensions', () => {
    printGenerationResult(makeSuccess());
    const output = logged.join('\n');
    expect(output).toContain('1344 × 768');
  });

  it('prints None when negative prompt is empty', () => {
    printGenerationResult(makeSuccess({ output: sampleOutputEmpty }));
    const output = logged.join('\n');
    expect(output).toContain('None');
  });

  it('shows Deterministic mode label for deterministic output', () => {
    printGenerationResult(makeSuccess({ normalizedBy: 'deterministic' }));
    const output = logged.join('\n');
    expect(output).toContain('Deterministic');
  });

  it('shows LLM mode label for LLM-normalized output', () => {
    printGenerationResult(makeSuccess({ normalizedBy: 'llm' }));
    const output = logged.join('\n');
    expect(output).toContain('LLM');
  });

  it('shows fallback info message when llmWarning is present', () => {
    printGenerationResult(makeSuccess({ llmWarning: 'Connection refused' }));
    const output = logged.join('\n');
    expect(output).toContain('LLM normalization unavailable, using deterministic prompt.');
  });

  it('does not show fallback message when no llmWarning', () => {
    printGenerationResult(makeSuccess());
    const output = logged.join('\n');
    expect(output).not.toContain('LLM normalization unavailable');
  });
});

describe('printGenerationError', () => {
  it('prints stage and error message', () => {
    const error: GenerationError = {
      success: false,
      stage: 'mapping',
      error: 'Validation failed',
    };
    printGenerationError(error);
    const output = logged.join('\n');
    expect(output).toContain('mapping');
    expect(output).toContain('Validation failed');
  });

  it('prints details when present', () => {
    const error: GenerationError = {
      success: false,
      stage: 'mapping',
      error: 'Validation failed',
      details: ['type: Invalid value', 'model: Invalid value'],
    };
    printGenerationError(error);
    const output = logged.join('\n');
    expect(output).toContain('type: Invalid value');
    expect(output).toContain('model: Invalid value');
  });

  it('does not print details section when no details', () => {
    const error: GenerationError = {
      success: false,
      stage: 'model-loading',
      error: 'Config not found',
    };
    printGenerationError(error);
    const output = logged.join('\n');
    expect(output).not.toContain('Details:');
  });
});

describe('printDebugOutput', () => {
  it('prints intermediate schema as JSON', () => {
    printDebugOutput(makeSuccess());
    const output = logged.join('\n');
    expect(output).toContain('"type": "image"');
    expect(output).toContain('"model": "flux"');
    expect(output).toContain('"positivePrompt"');
  });

  it('shows original deterministic prompt when LLM mode used and prompt provided', () => {
    const result = makeSuccess({ normalizedBy: 'llm' });
    printDebugOutput(result, 'Original deterministic prompt here');
    const output = logged.join('\n');
    expect(output).toContain('Original Deterministic Prompt');
    expect(output).toContain('Original deterministic prompt here');
  });

  it('does not show deterministic prompt section in deterministic mode', () => {
    printDebugOutput(makeSuccess({ normalizedBy: 'deterministic' }), 'some prompt');
    const output = logged.join('\n');
    expect(output).not.toContain('Original Deterministic Prompt');
  });

  it('shows LLM warning in debug when present', () => {
    printDebugOutput(makeSuccess({ llmWarning: 'Timeout after 15s' }));
    const output = logged.join('\n');
    expect(output).toContain('LLM Warning');
    expect(output).toContain('Timeout after 15s');
  });

  it('does not show LLM warning section when no warning', () => {
    printDebugOutput(makeSuccess());
    const output = logged.join('\n');
    expect(output).not.toContain('LLM Warning');
  });
});
