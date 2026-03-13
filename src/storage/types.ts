export interface StorageConfig {
  databaseUrl: string;
  connectTimeoutMs: number;
}

export interface PromptRunInsert {
  type: string;
  model: string;
  style: string;
  subject: string;
  scene: string;
  mood: string;
  composition: string;
  lighting: string;
  cameraLens: string;
  normalizedBy: 'deterministic' | 'llm';
  positivePrompt: string;
  negativePrompt: string;
  llmProvider: string | null;
  llmModel: string | null;
  llmWarning: string | null;
  appVersion: string;
  storageVersion: number;
}

export interface PromptRunRow {
  id: string;
  createdAt: Date;
  type: string;
  model: string;
  style: string;
  subject: string;
  scene: string;
  mood: string;
  composition: string;
  lighting: string;
  cameraLens: string;
  normalizedBy: 'deterministic' | 'llm';
  positivePrompt: string;
  negativePrompt: string;
  llmProvider: string | null;
  llmModel: string | null;
  llmWarning: string | null;
  appVersion: string;
  storageVersion: number;
}

export interface PromptRunSummary {
  id: string;
  createdAt: Date;
  model: string;
  normalizedBy: 'deterministic' | 'llm';
  positivePromptPreview: string;
}
