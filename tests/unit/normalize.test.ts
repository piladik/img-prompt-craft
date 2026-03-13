import { describe, it, expect, vi } from 'vitest';
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

describe('normalizeWithLlm', () => {
  it('returns rewritten prompt on successful LLM response', async () => {
    const rewritten =
      'A confident young woman stands on a bustling modern city street, bathed in warm golden hour sunlight, captured in a cinematic medium shot through an 85mm portrait lens.';
    const client = mockClient(async () => rewritten);

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.rewrittenPrompt).toBe(rewritten);
    expect(client.complete).toHaveBeenCalledTimes(1);
  });

  it('retries once on first failure, succeeds on second attempt', async () => {
    const rewritten = 'A confident woman on the city street at golden hour.';
    let callCount = 0;
    const client = mockClient(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Network timeout');
      return rewritten;
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.rewrittenPrompt).toBe(rewritten);
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('returns failure after both attempts fail with network error', async () => {
    const client = mockClient(async () => {
      throw new Error('Connection refused');
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('Connection refused');
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('returns failure after both attempts fail with timeout', async () => {
    const client = mockClient(async () => {
      throw new Error('Request timed out');
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('Request timed out');
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('returns failure when both attempts return invalid responses (missing subject)', async () => {
    const client = mockClient(async () => 'A beautiful sunset over a city street.');

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('subject');
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('returns failure when both attempts return metadata-laden responses', async () => {
    const client = mockClient(async () => "Here's the rewritten prompt: A woman on a street.");

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('metadata');
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('returns failure when both attempts return empty responses', async () => {
    const client = mockClient(async () => '   ');

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('empty');
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('returns failure when both attempts exceed max prompt length', async () => {
    const shortConfig = { ...llmConfig, maxPromptLength: 20 };
    const client = mockClient(async () => 'A confident young woman stands on a city street at golden hour in cinematic style.');

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, shortConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('max length');
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('retries on validation failure then succeeds with valid response', async () => {
    let callCount = 0;
    const client = mockClient(async () => {
      callCount++;
      if (callCount === 1) return 'A beautiful sunset with no people.';
      return 'A confident woman walks through a golden-lit city street.';
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.rewrittenPrompt).toContain('woman');
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('first attempt throws, second returns invalid — reports validation reason', async () => {
    let callCount = 0;
    const client = mockClient(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Network error');
      return 'A sunset over the ocean.';
    });

    const result = await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toContain('subject');
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it('passes system and user prompts to the client', async () => {
    const client = mockClient(async () => 'A confident woman on a sunlit city street.');

    await normalizeWithLlm(
      intermediate, deterministicPrompt, fluxConfig, llmConfig, client, MODELS_DIR,
    );

    const [systemArg, userArg] = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(systemArg).toContain('Flux');
    expect(systemArg).toContain('500');
    expect(userArg).toContain(deterministicPrompt);
    expect(userArg).toContain('cinematic-realism');
  });
});
