import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  printGenerationResult,
  printGenerationError,
  printDebugOutput,
} from '../../src/cli/display.js';
import type { NormalizedOutput } from '../../src/normalization/types.js';
import type { IntermediatePrompt } from '../../src/domain/schema.js';
import type { GenerationError } from '../../src/normalization/generate.js';

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

describe('printGenerationResult', () => {
  it('prints positive prompt', () => {
    printGenerationResult(sampleOutput);
    const output = logged.join('\n');
    expect(output).toContain('Medium shot of a confident young woman');
  });

  it('prints negative prompt', () => {
    printGenerationResult(sampleOutput);
    const output = logged.join('\n');
    expect(output).toContain('blurry, bad anatomy');
  });

  it('prints dimensions', () => {
    printGenerationResult(sampleOutput);
    const output = logged.join('\n');
    expect(output).toContain('1344 × 768');
  });

  it('prints None when negative prompt is empty', () => {
    printGenerationResult(sampleOutputEmpty);
    const output = logged.join('\n');
    expect(output).toContain('None');
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
    const intermediate: IntermediatePrompt = {
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
    printDebugOutput(intermediate, sampleOutput);
    const output = logged.join('\n');
    expect(output).toContain('"type": "image"');
    expect(output).toContain('"model": "flux"');
    expect(output).toContain('"positivePrompt"');
  });
});
