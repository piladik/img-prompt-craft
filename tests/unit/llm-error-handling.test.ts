import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { normalizeWithLlm } from '../../src/llm/index.js';
import type { LlmClient, LlmConfig } from '../../src/llm/index.js';
import type { ModelConfig } from '../../src/models/model-config-schema.js';
import type { IntermediatePrompt } from '../../src/domain/schema.js';

const MODELS_DIR = join(import.meta.dirname, '..', '..', 'models');

const fluxConfig: ModelConfig = {
  id: 'flux',
  label: 'Flux',
  promptStrategy: 'natural-language',
  promptGuidance: 'Flux responds best to natural-language prompts.',
  positivePromptTemplate: '{composition} of a {mood} {subject}',
  negativePromptSeparator: ', ',
  defaultNegativePrefix: '',
  aspectRatioMap: { '1:1': { width: 1024, height: 1024 } },
};

const llmConfig: LlmConfig = {
  apiKey: 'sk-test',
  model: 'openai/gpt-5.4',
  baseUrl: 'https://openrouter.ai/api/v1',
  timeoutMs: 15_000,
  maxPromptLength: 500,
};

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
  negativePrompt: ['blurry', 'bad-anatomy'],
  promptIntent: 'A confident young woman on a city street at golden hour',
  metadata: { createdAt: '2026-03-09T12:00:00.000Z', appVersion: '0.1.0' },
};

const deterministicPrompt =
  'Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism';

function mockClient(impl: (sys: string, usr: string) => Promise<string>): LlmClient {
  return { complete: vi.fn(impl) };
}

describe('error classification in failure reasons', () => {
  it('surfaces timeout message', async () => {
    const client = mockClient(async () => {
      throw new Error('LLM request timed out. Try again or use deterministic mode.');
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('timed out');
  });

  it('surfaces rate limit message', async () => {
    const client = mockClient(async () => {
      throw new Error('LLM rate limited (429). Wait a moment or use deterministic mode.');
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('429');
    expect(result.reason).toContain('rate limited');
  });

  it('surfaces authentication error message', async () => {
    const client = mockClient(async () => {
      throw new Error('LLM authentication failed. Check your OPENROUTER_API_KEY.');
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('authentication failed');
  });

  it('surfaces connection error message', async () => {
    const client = mockClient(async () => {
      throw new Error('LLM connection failed. Check your network or try again.');
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('connection failed');
  });

  it('surfaces generic HTTP error message', async () => {
    const client = mockClient(async () => {
      throw new Error('LLM request failed (HTTP 500): Internal server error');
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('HTTP 500');
  });
});

describe('debug logging', () => {
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

  it('prints LLM request details in debug mode', async () => {
    const client = mockClient(async () => 'A confident woman on a city street at golden hour.');

    await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
      { debug: true },
    );

    const output = logged.join('\n');
    expect(output).toContain('LLM Request');
    expect(output).toContain('openai/gpt-5.4');
    expect(output).toContain('openrouter.ai');
    expect(output).toContain('15000');
  });

  it('prints LLM response in debug mode', async () => {
    const rewritten = 'A confident woman on a city street at golden hour.';
    const client = mockClient(async () => rewritten);

    await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
      { debug: true },
    );

    const output = logged.join('\n');
    expect(output).toContain('LLM Response');
    expect(output).toContain(rewritten);
  });

  it('prints error details in debug mode on failure', async () => {
    const client = mockClient(async () => {
      throw new Error('Connection refused');
    });

    await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
      { debug: true },
    );

    const output = logged.join('\n');
    expect(output).toContain('LLM Error');
    expect(output).toContain('Connection refused');
  });

  it('prints validation failure reason in debug mode', async () => {
    const client = mockClient(async () => 'A sunset over the ocean.');

    await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
      { debug: true },
    );

    const output = logged.join('\n');
    expect(output).toContain('Validation failed');
    expect(output).toContain('subject');
  });

  it('does not print debug output when debug is false', async () => {
    const client = mockClient(async () => 'A confident woman on a city street at golden hour.');

    await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
      { debug: false },
    );

    const output = logged.join('\n');
    expect(output).not.toContain('LLM Request');
    expect(output).not.toContain('LLM Response');
  });

  it('never prints the API key in debug output', async () => {
    const client = mockClient(async () => 'A confident woman on a city street at golden hour.');

    await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
      { debug: true },
    );

    const output = logged.join('\n');
    expect(output).not.toContain('sk-test');
    expect(output).not.toContain('apiKey');
  });
});
