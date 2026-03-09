import OpenAI from 'openai';
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  RateLimitError,
  AuthenticationError,
  APIError,
} from 'openai/error';
import type { LlmClient, LlmConfig } from './types.js';

export class OpenRouterClient implements LlmClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: LlmConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/comfy-prompt-generator',
        'X-Title': 'Comfy Prompt Generator',
      },
      timeout: config.timeoutMs,
    });
    this.model = config.model;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('LLM returned an empty response');
      }
      return content;
    } catch (err) {
      throw classifyError(err);
    }
  }
}

function classifyError(err: unknown): Error {
  if (err instanceof APIConnectionTimeoutError) {
    return new Error('LLM request timed out. Try again or use deterministic mode.');
  }
  if (err instanceof RateLimitError) {
    return new Error('LLM rate limited (429). Wait a moment or use deterministic mode.');
  }
  if (err instanceof AuthenticationError) {
    return new Error('LLM authentication failed. Check your OPENROUTER_API_KEY.');
  }
  if (err instanceof APIConnectionError) {
    return new Error('LLM connection failed. Check your network or try again.');
  }
  if (err instanceof APIError) {
    return new Error(`LLM request failed (HTTP ${err.status}): ${err.message}`);
  }
  if (err instanceof Error) {
    return err;
  }
  return new Error('Unknown LLM error');
}

export function createLlmClient(config: LlmConfig): LlmClient {
  return new OpenRouterClient(config);
}
