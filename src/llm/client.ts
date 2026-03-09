import OpenAI from 'openai';
import type { LlmClient, LlmConfig } from './types.js';

export class OpenRouterClient implements LlmClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly timeoutMs: number;

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
    this.timeoutMs = config.timeoutMs;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
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
  }
}

export function createLlmClient(config: LlmConfig): LlmClient {
  return new OpenRouterClient(config);
}
