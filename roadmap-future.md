# PostgreSQL Prompt Storage

## Objective
- Add persistent PostgreSQL-backed storage for generated prompts and their source inputs.
- Keep the interactive CLI flow primary while making storage an optional capability that can be enabled with environment configuration.
- Store enough data to review, reuse, compare, and debug prompt generations across deterministic and LLM-assisted runs.
- Keep database access isolated behind a small storage module so prompt generation logic stays independent from persistence details.

## Current Relevant State
- The CLI already produces validated `RawAnswers`, an `IntermediatePrompt`, a `NormalizedOutput`, and a `normalizedBy` mode.
- The generation pipeline can succeed in deterministic mode or in LLM mode with deterministic fallback.
- The application currently prints results to the terminal only and does not persist generation history.
- Existing runtime validation uses `zod`, and the codebase is organized around focused modules with explicit boundaries.

## Feature Scope
- Database: PostgreSQL only for the first storage implementation.
- Stored record type: prompt generation runs.
- Initial user model: single-user local CLI, no authentication in v1.
- Primary capabilities:
  - save a generated prompt run
  - list recent saved prompt runs
  - view one saved prompt run in detail
  - reuse saved source inputs to start a new generation flow later
- Out of scope for the first implementation:
  - multi-user accounts
  - remote sync across devices
  - full text search beyond simple SQL filters
  - prompt sharing or public links
  - editing saved prompt records in place

## Why PostgreSQL Storage
- Prompt history becomes useful only when users can revisit successful generations later.
- PostgreSQL gives durable storage, strong filtering, and clear migration paths as the schema evolves.
- Storing both inputs and outputs makes debugging easier when deterministic and LLM results differ.
- A relational database keeps the door open for future features such as favorites, tags, collections, or prompt usage analytics.

## Recommended Stack
- Database: PostgreSQL 16+
- Node.js driver: `pg`
- Migration strategy: SQL migration files plus a small migration runner script
- Validation: `zod` for env vars, database row decoding, and JSON payload validation
- Tests:
  - `vitest` for repository and serialization logic
  - integration tests against a temporary PostgreSQL instance
- Env loading: existing `--env-file=.env` flow

## Why This Stack
- `pg` is stable, well understood, and keeps the storage layer explicit instead of hiding SQL behind a large abstraction.
- SQL migrations are easy to review and keep the database contract visible.
- A mostly relational schema keeps storage lean and easy to inspect while still supporting future schema changes.
- Reusing `zod` maintains one consistent runtime-validation approach across CLI, LLM, and storage boundaries.

## Proposed Project Structure
- `src/storage/` - database config, connection creation, repository functions, row mappers
- `src/storage/schema/` - zod schemas for stored rows and JSON payloads
- `src/storage/migrations/` - SQL migration files
- `src/storage/run-migrations.ts` - migration runner entry point
- `src/storage/repositories/` - focused query modules for prompt runs
- `src/storage/types.ts` - storage-facing TypeScript types
- `src/cli/history/` - interactive flows for listing and inspecting saved prompts
- `tests/unit/storage/` - serialization, decoding, and repository unit tests
- `tests/integration/storage/` - PostgreSQL-backed integration tests

## Stored Data Design

### Prompt Run Record Goal
- Each saved record should capture what the user selected, what the application generated, and how the result was produced.
- The saved data should support later display, filtering, comparison, and regeneration.
- The storage model should preserve the current generation pipeline contract rather than forcing prompt generation to become database-aware.

### Suggested `prompt_runs` Table
- `id` - UUID primary key
- `created_at` - timestamp with time zone
- `type` - prompt type such as `image`
- `model` - selected model id such as `flux`
- `style` - selected style id
- `subject` - selected subject id
- `scene` - selected scene id
- `mood` - selected mood id
- `aspect_ratio` - selected aspect ratio value
- `composition` - selected composition id
- `lighting` - selected lighting id
- `camera_lens` - selected camera lens id
- `normalized_by` - `deterministic` or `llm`
- `positive_prompt` - final positive prompt string shown to the user
- `negative_prompt` - final negative prompt string shown to the user
- `width` - generated width
- `height` - generated height
- `llm_provider` - nullable provider id when LLM mode is used
- `llm_model` - nullable LLM model id when LLM mode is used
- `llm_warning` - nullable fallback or warning message
- `app_version` - app version used to create the record
- `storage_version` - integer for future storage migrations

### Suggested Indexes
- index on `created_at desc`
- index on `model`
- index on `normalized_by`
- optional composite index on `(model, created_at desc)`

### Lean Storage Shape
- Store the user selections as explicit relational columns instead of full raw-answer or intermediate-schema snapshots.
- Store only the final generated prompt text, dimensions, and a few nullable LLM metadata columns.
- Keep the record compact enough to browse directly in SQL without decoding large payloads.
- If future requirements need richer auditing, add a separate optional debug table instead of bloating the main history table.

## Data Contract Decisions to Lock Early
- The main history table should store only the normalized selections and final generated outputs needed for browsing and reuse.
- Reuse should rebuild a new generation input object from relational columns rather than from saved raw JSON.
- Rich debugging payloads should stay out of the main table unless a later requirement justifies a separate optional audit store.
- Failed generations should not be stored in v1 unless a later requirement appears for audit or debugging history.
- Database writes should happen only after a successful generation result is available.
- If storage is enabled but the database write fails, the CLI should still show the generated prompt and clearly report that persistence failed.

## Step-by-Step Plan

### Step 1: Lock Product Decisions
- [ ] Confirm that PostgreSQL is the only supported storage backend for v1.
- [ ] Confirm that storage remains optional and disabled unless database env vars are present.
- [ ] Confirm whether successful generations should auto-save by default or ask for confirmation after each run.
- [ ] Confirm whether the first history view is interactive-only, command-based, or both.
- [ ] Confirm whether reuse should prefill the flow silently or show a review screen first.
- [ ] Confirm whether deterministic and LLM-generated results are both stored with the same table shape.

### Step 1 Recommended Decisions
- PostgreSQL is the only storage backend in v1.
- Storage is optional and enabled only when required env vars are configured.
- Successful generations auto-save when storage is enabled to avoid interrupting the normal CLI flow.
- The first history experience is an interactive menu reached from the CLI, not a large set of flags.
- Reuse should show a confirmation screen before launching a new generation.
- Deterministic and LLM results share one table shape; `normalized_by`, `llm_provider`, `llm_model`, and `llm_warning` capture the differences.

### Step 2: Define the Storage User Flow
- [ ] Decide where storage appears in the existing CLI flow.
- [ ] Decide how users access saved history.
- [ ] Decide how detailed records are displayed in the terminal.
- [ ] Decide how reuse of a saved prompt run restarts generation.
- [ ] Define behavior when storage is unavailable, misconfigured, or temporarily down.

### Step 2 Recommended Flow
- After a successful generation, the CLI saves the prompt run automatically when storage is enabled.
- After saving, the final action prompt can offer:
  - `generate-again`
  - `view-recent-history`
  - `exit`
- `view-recent-history` shows the most recent saved prompt runs with concise labels:
  - created timestamp
  - model
  - normalization mode
  - short positive-prompt preview
- Selecting one record shows a detail view with:
  - saved selections summary
  - positive prompt
  - negative prompt
  - dimensions
  - normalized mode
  - optional LLM warning
- The detail view offers:
  - `reuse-inputs`
  - `back-to-history`
  - `exit`
- `reuse-inputs` rebuilds the generation inputs from the stored selection columns, shows a confirmation screen, then starts a new generation using those inputs as the base.

### Step 3: Define the Database Connection Contract
- [ ] Add storage env vars.
- [ ] Validate env vars with `zod`.
- [ ] Decide connection pooling strategy for a short-lived CLI process.
- [ ] Decide startup behavior if storage is enabled but the database is unreachable.

### Step 3 Recommended Env Vars
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_SSL`
- `POSTGRES_CONNECT_TIMEOUT_MS`
- `PROMPT_STORAGE_ENABLED`

### Step 3 Decisions
- `PROMPT_STORAGE_ENABLED=1` enables storage only when all required PostgreSQL variables are valid.
- Connection config is parsed once at startup.
- The CLI should test the database connection lazily on the first storage action, not block every startup when storage is disabled.
- If storage is enabled but the database is unreachable, generation still works and the CLI prints a concise persistence warning.

### Step 4: Create the Storage Types and Schemas
- [ ] Add TypeScript types for storage config, insert payloads, row shapes, and history summaries.
- [ ] Add `zod` schemas for env parsing.
- [ ] Add `zod` schemas for decoding database rows into typed history records.
- [ ] Define helper mappers from `GenerationSuccess` plus the validated prompt selections into a storage insert object.
- [ ] Add tests for valid and invalid row decoding.

### Step 5: Create the Initial Database Schema
- [ ] Write the first SQL migration for `prompt_runs`.
- [ ] Add indexes for common history queries.
- [ ] Add a migration table to track applied migrations.
- [ ] Create a migration runner that applies pending SQL files in order.
- [ ] Add a safe startup or manual command for running migrations locally.

### Step 5 Suggested SQL Constraints
- `normalized_by` limited to `deterministic` and `llm`
- positive and negative prompt columns as `text`
- width and height as positive integers
- `storage_version` default to `1`
- nullable LLM metadata columns allowed only when they add value to the saved record

### Step 6: Build the Database Access Layer
- [ ] Create a connection factory that returns a configured PostgreSQL client or pool.
- [ ] Keep SQL execution helpers separate from query mapping logic.
- [ ] Add a prompt-run repository with focused methods:
  - `savePromptRun()`
  - `listRecentPromptRuns()`
  - `getPromptRunById()`
- [ ] Return narrow result types and actionable errors.
- [ ] Ensure all database errors are caught and converted into concise storage-layer errors.

### Step 7: Wire Prompt Saving into the Generation Pipeline
- [ ] Decide the exact orchestration boundary for persistence.
- [ ] Save a prompt run only after `generatePrompt()` returns success.
- [ ] Pass the successful generation result and the normalized selection fields into the persistence layer.
- [ ] Avoid mixing SQL logic into CLI display code.
- [ ] Ensure save failures do not mutate or hide the generated output.

### Step 7 Integration Note
- The cleanest first boundary is:
  - interactive flow collects `RawAnswers`
  - generation pipeline returns `GenerationResult`
  - orchestration layer decides whether to call storage
- This keeps `generatePrompt()` pure with respect to persistence and makes it easier to test generation independently from database behavior.

### Step 8: Add Interactive History Browsing
- [ ] Add a CLI entry point or menu action for browsing saved prompt history.
- [ ] Build a small history summary formatter for terminal output.
- [ ] Add pagination or a configurable recent-limit if the history grows.
- [ ] Add a detail view for one selected record.
- [ ] Add clear empty-state messaging when no prompts have been saved.

### Step 8 Recommended First History Scope
- Show the latest 10 saved prompt runs.
- Sort descending by `created_at`.
- Show a one-line preview per record.
- Allow selecting one record for details.
- Do not implement search, tags, favorites, or editing in the first pass.

### Step 9: Add Reuse from Saved Inputs
- [ ] Define a mapper from stored selection columns back into the current answer schema.
- [ ] Validate rebuilt answers with the current runtime schema.
- [ ] Decide how to handle saved records from older app versions that no longer match the current schema.
- [ ] Add a confirmation screen before regeneration.
- [ ] Add tests for valid reuse and incompatible-history failures.

### Step 9 Decisions
- Reuse should start from stored selection columns, not from the rendered prompt text.
- If stored answers fail validation because the schema changed, the CLI should show a concise incompatibility message and return the user to history.
- `storage_version` should be used to support future migrations of saved records when selection shapes evolve.

### Step 10: Add Error Handling and Safe Fallbacks
- [ ] Handle invalid env configuration.
- [ ] Handle connection failures.
- [ ] Handle migration failures.
- [ ] Handle insert failures.
- [ ] Handle malformed or incomplete stored records when reading history.
- [ ] Handle reuse failures caused by old or corrupted records.

### Step 10 Error-Handling Rules
- Storage errors should never prevent prompt generation when the generator itself succeeded.
- Normal mode should show short recovery-oriented messages, not stack traces.
- Debug mode can print detailed storage diagnostics.
- History reads should fail gracefully and return the user to the previous menu.
- Corrupted saved records should be reported clearly with record id and failure reason.

### Step 11: Add Tests
- [ ] Unit test env parsing and connection config building.
- [ ] Unit test generation-result to insert-payload mapping.
- [ ] Unit test row decoding and history-summary formatting.
- [ ] Integration test migrations against PostgreSQL.
- [ ] Integration test successful save after deterministic generation.
- [ ] Integration test successful save after LLM generation.
- [ ] Integration test save failure with generation success fallback.
- [ ] Integration test listing and loading recent history.
- [ ] Integration test reuse of saved inputs.

### Step 12: Document the Feature
- [ ] Document PostgreSQL setup in `README`.
- [ ] Document required env vars and an example `.env` snippet.
- [ ] Document how to run migrations.
- [ ] Document how storage behaves when the database is unavailable.
- [ ] Document how history browsing and reuse work.
- [ ] Document which data is stored and which secrets are not stored.

## Deliverables for Prompt Storage Completion
- [ ] PostgreSQL-backed prompt history storage
- [ ] SQL migration system and initial schema
- [ ] Storage module isolated from generation logic
- [ ] Automatic save on successful generation when enabled
- [ ] Interactive history list and detail view
- [ ] Reuse flow from saved selection columns
- [ ] Tests for mapping, repository behavior, migrations, and CLI integration
- [ ] README documentation for setup and usage

## Risks and Decisions to Resolve Early
- [ ] Decide whether auto-save should be default behavior or user-confirmed behavior.
- [ ] Decide exactly which selection fields must be stored as first-class columns.
- [ ] Decide how to handle future schema changes for saved records.
- [ ] Decide whether storage should be best-effort or strict-failure mode in some environments.
- [ ] Decide whether future prompt presets and saved prompt history should share one storage model or stay separate.
- [ ] Decide whether a future export feature should read from PostgreSQL or from the in-memory generation result.

### Recommended Early Resolutions
- Storage is best-effort in local CLI mode.
- Store only the fields required for history, reuse, and debugging the final result.
- Add `storage_version` now rather than retrofitting versioning later.
- Keep saved prompt history separate from future user-authored presets even if both eventually live in PostgreSQL.
- Treat export as a separate feature that can reuse the saved record model later.

## Suggested Implementation Order
- [ ] Add storage env parsing and configuration
- [ ] Add storage types and `zod` schemas
- [ ] Create SQL migrations and migration runner
- [ ] Implement PostgreSQL connection and repository layer
- [ ] Wire save-after-success into CLI orchestration
- [ ] Add history list and detail views
- [ ] Add reuse-from-history flow
- [ ] Add integration tests
- [ ] Add README docs
