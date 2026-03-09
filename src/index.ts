#!/usr/bin/env node

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import type { GenerationError } from './normalization/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = join(__dirname, '..', 'models');
const DEBUG = process.env.DEBUG === '1' || process.argv.includes('--debug');
const LLM_ENABLED = process.argv.includes('--llm');

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

async function handleRecovery(error: GenerationError, answers: RawAnswers): Promise<boolean> {
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
        return true;
      }
      error = retry;
      printGenerationError(retry);
      continue;
    }

    if (recovery === 'restart-flow') {
      return false;
    }

    process.exit(1);
  }

  return false;
}

async function runGeneration(answers: RawAnswers): Promise<boolean> {
  const result = await generatePrompt(answers, MODELS_DIR, llmOptions);

  if (result.success) {
    printGenerationResult(result);
    if (DEBUG) {
      printDebugOutput(result);
    }
    return true;
  }

  return handleRecovery(result, answers);
}

async function main(): Promise<void> {
  initLlmIfEnabled();
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

    const generated = await runGeneration(answers);

    if (!generated) {
      continue;
    }

    const next = await askPostGeneration();
    if (next === 'exit') {
      running = false;
    }
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
