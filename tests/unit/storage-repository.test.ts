import { describe, it, expect, vi } from 'vitest';
import {
  savePromptRun,
  listRecentPromptRuns,
  getPromptRunById,
} from '../../src/storage/repositories/prompt-runs.js';
import type { PromptRunInsert } from '../../src/storage/types.js';

function validDbRow(overrides?: Record<string, unknown>) {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    created_at: '2026-03-09T12:00:00.000Z',
    type: 'image',
    model: 'flux',
    style: 'cinematic-realism',
    subject: 'young-woman',
    scene: 'modern-city-street',
    mood: 'confident',
    aspect_ratio: '16:9',
    composition: 'medium-shot',
    lighting: 'golden-hour-sunlight',
    camera_lens: '85mm-portrait-lens',
    normalized_by: 'deterministic',
    positive_prompt: 'A confident young woman',
    negative_prompt: 'blurry',
    width: 1344,
    height: 768,
    llm_provider: null,
    llm_model: null,
    llm_warning: null,
    app_version: '0.1.0',
    storage_version: 1,
    ...overrides,
  };
}

function validInsert(): PromptRunInsert {
  return {
    type: 'image',
    model: 'flux',
    style: 'cinematic-realism',
    subject: 'young-woman',
    scene: 'modern-city-street',
    mood: 'confident',
    aspectRatio: '16:9',
    composition: 'medium-shot',
    lighting: 'golden-hour-sunlight',
    cameraLens: '85mm-portrait-lens',
    normalizedBy: 'deterministic',
    positivePrompt: 'A confident young woman',
    negativePrompt: 'blurry',
    width: 1344,
    height: 768,
    llmProvider: null,
    llmModel: null,
    llmWarning: null,
    appVersion: '0.1.0',
    storageVersion: 1,
  };
}

function mockClient(queryResult: { rows: Record<string, unknown>[] }) {
  return { query: vi.fn().mockResolvedValue(queryResult) } as any;
}

function failingClient(error: Error) {
  return { query: vi.fn().mockRejectedValue(error) } as any;
}

describe('savePromptRun', () => {
  it('returns success with decoded row on valid insert', async () => {
    const client = mockClient({ rows: [validDbRow()] });
    const result = await savePromptRun(client, validInsert());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(result.data.model).toBe('flux');
    expect(result.data.normalizedBy).toBe('deterministic');
  });

  it('returns storage error when query fails', async () => {
    const client = failingClient(new Error('connection reset'));
    const result = await savePromptRun(client, validInsert());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('connection reset');
  });

  it('returns storage error when returned row fails decoding', async () => {
    const client = mockClient({ rows: [{ ...validDbRow(), id: 'not-a-uuid' }] });
    const result = await savePromptRun(client, validInsert());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBeTruthy();
  });

  it('passes 20 parameters to the query', async () => {
    const client = mockClient({ rows: [validDbRow()] });
    await savePromptRun(client, validInsert());

    const callArgs = client.query.mock.calls[0];
    expect(callArgs[1]).toHaveLength(20);
  });
});

describe('listRecentPromptRuns', () => {
  it('returns decoded summaries from valid rows', async () => {
    const client = mockClient({ rows: [validDbRow(), validDbRow({ id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })] });
    const result = await listRecentPromptRuns(client);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.summaries).toHaveLength(2);
    expect(result.data.skipped).toHaveLength(0);
  });

  it('skips corrupted rows instead of failing entirely', async () => {
    const goodRow = validDbRow();
    const badRow = { ...validDbRow(), id: 'not-a-uuid', normalized_by: 'invalid' };
    const client = mockClient({ rows: [goodRow, badRow] });

    const result = await listRecentPromptRuns(client);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.summaries).toHaveLength(1);
    expect(result.data.skipped).toHaveLength(1);
    expect(result.data.skipped[0].index).toBe(1);
  });

  it('captures the id and reason for skipped rows', async () => {
    const badRow = { ...validDbRow(), id: 'bad-uuid-here', normalized_by: 'invalid' };
    const client = mockClient({ rows: [badRow] });

    const result = await listRecentPromptRuns(client);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.skipped[0].id).toBe('bad-uuid-here');
    expect(result.data.skipped[0].reason).toBeTruthy();
  });

  it('returns empty summaries and skipped when no rows', async () => {
    const client = mockClient({ rows: [] });
    const result = await listRecentPromptRuns(client);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.summaries).toHaveLength(0);
    expect(result.data.skipped).toHaveLength(0);
  });

  it('returns storage error when query fails', async () => {
    const client = failingClient(new Error('relation "prompt_runs" does not exist'));
    const result = await listRecentPromptRuns(client);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('prompt_runs');
  });

  it('uses default limit of 10', async () => {
    const client = mockClient({ rows: [] });
    await listRecentPromptRuns(client);

    const callArgs = client.query.mock.calls[0];
    expect(callArgs[1]).toEqual([10]);
  });

  it('accepts a custom limit', async () => {
    const client = mockClient({ rows: [] });
    await listRecentPromptRuns(client, 5);

    const callArgs = client.query.mock.calls[0];
    expect(callArgs[1]).toEqual([5]);
  });
});

describe('getPromptRunById', () => {
  it('returns decoded row when found', async () => {
    const client = mockClient({ rows: [validDbRow()] });
    const result = await getPromptRunById(client, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toBeNull();
    expect(result.data!.model).toBe('flux');
  });

  it('returns null when no row found', async () => {
    const client = mockClient({ rows: [] });
    const result = await getPromptRunById(client, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toBeNull();
  });

  it('returns error with record id when query fails', async () => {
    const client = failingClient(new Error('connection lost'));
    const result = await getPromptRunById(client, 'abc-123');

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('abc-123');
    expect(result.error).toContain('connection lost');
  });

  it('returns error with record id when row decoding fails', async () => {
    const client = mockClient({ rows: [{ ...validDbRow(), width: -1 }] });
    const result = await getPromptRunById(client, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });
});
