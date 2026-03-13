import { z } from 'zod';
import type { PromptRunRow, PromptRunSummary } from './types.js';

const normalizedBySchema = z.enum(['deterministic', 'llm']);

export const promptRunRowSchema = z
  .object({
    id: z.string().uuid(),
    created_at: z.coerce.date(),
    type: z.string(),
    model: z.string(),
    style: z.string(),
    subject: z.string(),
    scene: z.string(),
    mood: z.string(),
    composition: z.string(),
    lighting: z.string(),
    camera_lens: z.string(),
    normalized_by: normalizedBySchema,
    positive_prompt: z.string(),
    negative_prompt: z.string(),
    llm_provider: z.string().nullable(),
    llm_model: z.string().nullable(),
    llm_warning: z.string().nullable(),
    app_version: z.string(),
    storage_version: z.number().int(),
  })
  .transform((row): PromptRunRow => ({
    id: row.id,
    createdAt: row.created_at,
    type: row.type,
    model: row.model,
    style: row.style,
    subject: row.subject,
    scene: row.scene,
    mood: row.mood,
    composition: row.composition,
    lighting: row.lighting,
    cameraLens: row.camera_lens,
    normalizedBy: row.normalized_by,
    positivePrompt: row.positive_prompt,
    negativePrompt: row.negative_prompt,
    llmProvider: row.llm_provider,
    llmModel: row.llm_model,
    llmWarning: row.llm_warning,
    appVersion: row.app_version,
    storageVersion: row.storage_version,
  }));

const PREVIEW_MAX_LENGTH = 80;

export function decodePromptRunRow(raw: unknown): PromptRunRow {
  return promptRunRowSchema.parse(raw);
}

export function decodePromptRunSummary(raw: unknown): PromptRunSummary {
  const row = promptRunRowSchema.parse(raw);
  return {
    id: row.id,
    createdAt: row.createdAt,
    model: row.model,
    normalizedBy: row.normalizedBy,
    positivePromptPreview: truncatePreview(row.positivePrompt, PREVIEW_MAX_LENGTH),
  };
}

function truncatePreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
