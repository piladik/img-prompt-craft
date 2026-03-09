import { describe, it, expect, vi } from 'vitest';
import { OpenRouterClient, createLlmClient } from '../../src/llm/client.js';
import type { LlmConfig } from '../../src/llm/types.js';
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  RateLimitError,
  AuthenticationError,
  APIError,
} from 'openai/error';

const baseConfig: LlmConfig = {
  apiKey: 'sk-test-key',
  model: 'openai/gpt-5.4',
  baseUrl: 'https://openrouter.ai/api/v1',
  timeoutMs: 15_000,
  maxPromptLength: 500,
};

function makeClient(config?: Partial<LlmConfig>): OpenRouterClient {
  return new OpenRouterClient({ ...baseConfig, ...config });
}

function mockCreateMethod(client: OpenRouterClient, impl: () => Promise<unknown>) {
  const internal = (client as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
  internal.chat.completions.create = vi.fn(impl);
}

describe('OpenRouterClient', () => {
  it('returns content from a successful completion', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => ({
      choices: [{ message: { content: 'A rewritten prompt about a woman.' } }],
    }));

    const result = await client.complete('system', 'user');
    expect(result).toBe('A rewritten prompt about a woman.');
  });

  it('trims whitespace from response content', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => ({
      choices: [{ message: { content: '  trimmed response  ' } }],
    }));

    const result = await client.complete('system', 'user');
    expect(result).toBe('trimmed response');
  });

  it('throws on empty response content', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => ({
      choices: [{ message: { content: '' } }],
    }));

    await expect(client.complete('system', 'user')).rejects.toThrow('empty response');
  });

  it('throws on null content', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => ({
      choices: [{ message: { content: null } }],
    }));

    await expect(client.complete('system', 'user')).rejects.toThrow('empty response');
  });

  it('throws on empty choices array', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => ({ choices: [] }));

    await expect(client.complete('system', 'user')).rejects.toThrow('empty response');
  });

  it('classifies APIConnectionTimeoutError as timeout message', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => {
      throw new APIConnectionTimeoutError();
    });

    await expect(client.complete('system', 'user')).rejects.toThrow('timed out');
  });

  it('classifies RateLimitError as rate limit message', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => {
      throw new RateLimitError(429, { error: 'rate limited' }, 'rate limited', new Headers());
    });

    await expect(client.complete('system', 'user')).rejects.toThrow('rate limited (429)');
  });

  it('classifies AuthenticationError as auth message', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => {
      throw new AuthenticationError(401, { error: 'invalid key' }, 'invalid key', new Headers());
    });

    await expect(client.complete('system', 'user')).rejects.toThrow('authentication failed');
  });

  it('classifies APIConnectionError as connection message', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => {
      throw new APIConnectionError({ message: 'DNS lookup failed' });
    });

    await expect(client.complete('system', 'user')).rejects.toThrow('connection failed');
  });

  it('classifies generic APIError with status code', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => {
      throw APIError.generate(500, { error: 'internal' }, 'server error', new Headers());
    });

    await expect(client.complete('system', 'user')).rejects.toThrow('HTTP 500');
  });

  it('passes through unknown Error instances', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => {
      throw new Error('Something unexpected');
    });

    await expect(client.complete('system', 'user')).rejects.toThrow('Something unexpected');
  });

  it('wraps non-Error throws as unknown', async () => {
    const client = makeClient();
    mockCreateMethod(client, async () => {
      throw 'string error';
    });

    await expect(client.complete('system', 'user')).rejects.toThrow('Unknown LLM error');
  });
});

describe('createLlmClient', () => {
  it('returns an OpenRouterClient instance', () => {
    const client = createLlmClient(baseConfig);
    expect(client).toBeInstanceOf(OpenRouterClient);
  });

  it('returned client has a complete method', () => {
    const client = createLlmClient(baseConfig);
    expect(typeof client.complete).toBe('function');
  });
});
