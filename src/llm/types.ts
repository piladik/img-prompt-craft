export interface LlmConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxPromptLength: number;
}

export interface LlmNormalizationSuccess {
  success: true;
  rewrittenPrompt: string;
}

export interface LlmNormalizationFailure {
  success: false;
  reason: string;
}

export type LlmNormalizationResult = LlmNormalizationSuccess | LlmNormalizationFailure;

export interface LlmClient {
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}
