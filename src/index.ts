#!/usr/bin/env node

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  collectAnswers,
  askConfirmation,
  askPostGeneration,
  askRecoveryAction,
  printGenerationResult,
  printDebugOutput,
  printGenerationError,
} from './cli/index.js';
import {
  typeOptions,
  modelOptions,
  styleOptions,
  subjectOptions,
  sceneOptions,
  moodOptions,
  aspectRatioOptions,
  compositionOptions,
  lightingOptions,
  cameraLensOptions,
  negativePromptOptions,
} from './config/index.js';
import { generatePrompt } from './normalization/index.js';
import type { LlmOptions } from './normalization/index.js';
import { loadModelConfig } from './models/index.js';
import { getSupportedModelIds } from './models/index.js';
import { loadLlmConfig, createLlmClient } from './llm/index.js';
import type { RawAnswers } from './cli/index.js';
import type { GenerationError, GenerationSuccess } from './normalization/index.js';
import {
  loadStorageConfig,
  createClient,
  mapToPromptRunInsert,
  savePromptRun,
} from './storage/index.js';
import type { StorageConfig } from './storage/index.js';
import { runHistoryFlow } from './cli/history/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = join(__dirname, '..', 'models');
const APP_VERSION = '0.1.0';
const DEBUG = process.env.DEBUG === '1' || process.argv.includes('--debug');
const LLM_ENABLED = process.argv.includes('--llm');
const HISTORY_MODE = process.argv.includes('--history');

const lookup = {
  type: typeOptions,
  model: modelOptions,
  style: styleOptions,
  subject: subjectOptions,
  scene: sceneOptions,
  mood: moodOptions,
  aspectRatio: aspectRatioOptions,
  composition: compositionOptions,
  lighting: lightingOptions,
  cameraLens: cameraLensOptions,
  negativePrompt: negativePromptOptions,
};

let llmOptions: LlmOptions | undefined;
let storageConfig: StorageConfig | undefined;
let storageClient: pg.Client | undefined;

function initLlmIfEnabled(): void {
  if (!LLM_ENABLED) return;

  const configResult = loadLlmConfig();
  if (!configResult.success) {
    console.error(configResult.error);
    process.exit(1);
  }

  const client = createLlmClient(configResult.config);
  llmOptions = { config: configResult.config, client, debug: DEBUG };

  if (DEBUG) {
    console.log(`  LLM mode enabled (model: ${configResult.config.model})`);
  }
}

function initStorageConfig(): void {
  const result = loadStorageConfig();

  if (!result.success) {
    if (result.reason === 'invalid') {
      console.error(result.error);
      process.exit(1);
    }
    if (DEBUG) {
      console.log('  Storage disabled (PROMPT_STORAGE_ENABLED is not set to 1).');
    }
    return;
  }

  storageConfig = result.config;

  if (DEBUG) {
    console.log('  Storage enabled.');
  }
}

async function getStorageClient(): Promise<pg.Client | null> {
  if (!storageConfig) return null;

  if (storageClient) return storageClient;

  const client = createClient(storageConfig);
  try {
    await client.connect();
    storageClient = client;
    return storageClient;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  Storage unavailable — could not connect: ${message}`);
    if (DEBUG) {
      console.log(`  Connection string host: ${new URL(storageConfig.databaseUrl).hostname}`);
    }
    return null;
  }
}

function resetStorageClient(): void {
  storageClient = undefined;
}

async function trySavePromptRun(answers: RawAnswers, result: GenerationSuccess): Promise<void> {
  const client = await getStorageClient();
  if (!client) return;

  const insert = mapToPromptRunInsert({
    answers,
    result,
    appVersion: APP_VERSION,
    llmConfig: llmOptions?.config,
  });

  const saveResult = await savePromptRun(client, insert);

  if (!saveResult.success) {
    console.log(`  Storage unavailable — prompt not saved: ${saveResult.error}`);
    if (DEBUG) {
      console.log(`  Save failed for model="${insert.model}", normalizedBy="${insert.normalizedBy}".`);
    }
    resetStorageClient();
    return;
  }

  if (DEBUG) {
    console.log(`  Prompt saved (id: ${saveResult.data.id}).`);
  }
}

async function validateModelsOnStartup(): Promise<void> {
  const modelIds = getSupportedModelIds();
  for (const id of modelIds) {
    const result = await loadModelConfig(id, MODELS_DIR);
    if (!result.success) {
      console.error(`Startup check failed: ${result.error}`);
      console.error('Please ensure all model config files are present and valid.');
      process.exit(1);
    }
    if (DEBUG) {
      console.log(`  Model "${id}" config loaded successfully.`);
    }
  }
}

function canRetry(error: GenerationError): boolean {
  return error.stage !== 'mapping';
}

async function handleRecovery(
  error: GenerationError,
  answers: RawAnswers,
): Promise<GenerationSuccess | null> {
  printGenerationError(error);

  let recovering = true;
  while (recovering) {
    const recovery = await askRecoveryAction({ allowRetry: canRetry(error) });

    if (recovery === 'retry-generation') {
      const retry = await generatePrompt(answers, MODELS_DIR, llmOptions);
      if (retry.success) {
        printGenerationResult(retry);
        if (DEBUG) {
          printDebugOutput(retry);
        }
        return retry;
      }
      error = retry;
      printGenerationError(retry);
      continue;
    }

    if (recovery === 'restart-flow') {
      return null;
    }

    process.exit(1);
  }

  return null;
}

async function runGeneration(answers: RawAnswers): Promise<GenerationSuccess | null> {
  const result = await generatePrompt(answers, MODELS_DIR, llmOptions);

  if (result.success) {
    printGenerationResult(result);
    if (DEBUG) {
      printDebugOutput(result);
    }
    return result;
  }

  return handleRecovery(result, answers);
}

async function runHistory(): Promise<void> {
  initStorageConfig();

  if (!storageConfig) {
    console.error('Storage is not enabled. Set PROMPT_STORAGE_ENABLED=1 and DATABASE_URL in your .env file.');
    process.exit(1);
  }

  const client = await getStorageClient();
  if (!client) {
    console.error('Could not connect to the database. Check your DATABASE_URL and ensure PostgreSQL is running.');
    process.exit(1);
  }

  await runHistoryFlow(client, { debug: DEBUG });
  await client.end();
}

async function main(): Promise<void> {
  if (HISTORY_MODE) {
    await runHistory();
    return;
  }

  initLlmIfEnabled();
  initStorageConfig();
  await validateModelsOnStartup();

  let running = true;

  while (running) {
    const answers = await collectAnswers();
    const action = await askConfirmation(answers, lookup);

    if (action === 'cancel') {
      console.log('Prompt generation cancelled.');
      process.exit(0);
    }

    if (action === 'restart') {
      continue;
    }

    const result = await runGeneration(answers);

    if (!result) {
      continue;
    }

    if (storageConfig) {
      await trySavePromptRun(answers, result);
    }

    const next = await askPostGeneration();
    if (next === 'exit') {
      running = false;
    }
  }

  if (storageClient) {
    await storageClient.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log('\nPrompt generation cancelled.');
    process.exit(0);
  }
  console.error('\nUnexpected error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
