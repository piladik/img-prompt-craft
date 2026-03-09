import type pg from 'pg';
import type { PromptRunInsert, PromptRunRow, PromptRunSummary } from '../types.js';
import { decodePromptRunRow, decodePromptRunSummary } from '../schema.js';

export interface StorageSuccess<T> {
  success: true;
  data: T;
}

export interface StorageError {
  success: false;
  error: string;
}

export type StorageResult<T> = StorageSuccess<T> | StorageError;

const DEFAULT_RECENT_LIMIT = 10;

function toStorageError(err: unknown): StorageError {
  const message = err instanceof Error ? err.message : String(err);
  return { success: false, error: message };
}

export async function savePromptRun(
  client: pg.Client,
  insert: PromptRunInsert,
): Promise<StorageResult<PromptRunRow>> {
  const sql = `
    INSERT INTO prompt_runs (
      type, model, style, subject, scene, mood,
      aspect_ratio, composition, lighting, camera_lens,
      normalized_by, positive_prompt, negative_prompt,
      width, height,
      llm_provider, llm_model, llm_warning,
      app_version, storage_version
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15,
      $16, $17, $18,
      $19, $20
    ) RETURNING *
  `;

  const params = [
    insert.type,
    insert.model,
    insert.style,
    insert.subject,
    insert.scene,
    insert.mood,
    insert.aspectRatio,
    insert.composition,
    insert.lighting,
    insert.cameraLens,
    insert.normalizedBy,
    insert.positivePrompt,
    insert.negativePrompt,
    insert.width,
    insert.height,
    insert.llmProvider,
    insert.llmModel,
    insert.llmWarning,
    insert.appVersion,
    insert.storageVersion,
  ];

  try {
    const result = await client.query(sql, params);
    const row = decodePromptRunRow(result.rows[0]);
    return { success: true, data: row };
  } catch (err) {
    return toStorageError(err);
  }
}

export async function listRecentPromptRuns(
  client: pg.Client,
  limit: number = DEFAULT_RECENT_LIMIT,
): Promise<StorageResult<PromptRunSummary[]>> {
  const sql = `
    SELECT * FROM prompt_runs
    ORDER BY created_at DESC
    LIMIT $1
  `;

  try {
    const result = await client.query(sql, [limit]);
    const summaries = result.rows.map((row) => decodePromptRunSummary(row));
    return { success: true, data: summaries };
  } catch (err) {
    return toStorageError(err);
  }
}

export async function getPromptRunById(
  client: pg.Client,
  id: string,
): Promise<StorageResult<PromptRunRow | null>> {
  const sql = `SELECT * FROM prompt_runs WHERE id = $1`;

  try {
    const result = await client.query(sql, [id]);
    if (result.rows.length === 0) {
      return { success: true, data: null };
    }
    const row = decodePromptRunRow(result.rows[0]);
    return { success: true, data: row };
  } catch (err) {
    return toStorageError(err);
  }
}
