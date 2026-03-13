CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prompt_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  type             TEXT NOT NULL,
  model            TEXT NOT NULL,
  style            TEXT NOT NULL,
  subject          TEXT NOT NULL,
  scene            TEXT NOT NULL,
  mood             TEXT NOT NULL,
  composition      TEXT NOT NULL,
  lighting         TEXT NOT NULL,
  camera_lens      TEXT NOT NULL,
  normalized_by    TEXT NOT NULL CHECK (normalized_by IN ('deterministic', 'llm')),
  positive_prompt  TEXT NOT NULL,
  negative_prompt  TEXT NOT NULL,
  llm_provider     TEXT,
  llm_model        TEXT,
  llm_warning      TEXT,
  app_version      TEXT NOT NULL,
  storage_version  INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_prompt_runs_created_at ON prompt_runs (created_at DESC);
CREATE INDEX idx_prompt_runs_model ON prompt_runs (model);
CREATE INDEX idx_prompt_runs_normalized_by ON prompt_runs (normalized_by);
CREATE INDEX idx_prompt_runs_model_created_at ON prompt_runs (model, created_at DESC);
