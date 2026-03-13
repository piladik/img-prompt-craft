# Optional Input Selection Flow

## Objective
- Change the interactive CLI so `type`, `model`, and `subject` are always required, while the remaining inputs become optional and user-driven.
- Let the user choose which optional inputs they want to configure through a multi-select step before answering those optional questions.
- Keep one shared intermediate schema and avoid mixing model-specific behavior into the CLI question flow.
- Remove `aspectRatio` completely in this release. It must not appear in CLI answers, config exports, domain schemas, normalization inputs, normalized output, database/storage, history views, or tests.
- Remove explicit image-size tracking completely in this release. Model configs must not carry image-size data, normalized output must not expose `width` or `height`, and prompt-run storage must not persist `aspect_ratio`, `width`, or `height`.

## Current Relevant State
- The CLI currently asks every prompt field in a fixed linear order.
- `collectAnswers()` always collects `style`, `scene`, `mood`, `aspectRatio`, `composition`, `lighting`, `cameraLens`, and `negativePrompt`, even when the user does not care about all of them.
- The shared schema and generation pipeline expect a complete answer object today, including `aspectRatio` on the intermediate schema.
- Model configs currently include `aspectRatioMap`, and normalization derives `width` / `height` from it.
- Prompt history storage and database schema currently include `aspect_ratio`, `width`, and `height` for each prompt run.

## Problem to Solve
- The current flow asks too many questions for simple prompt-building sessions.
- Users cannot express "only ask me for a few optional refinements" before the questionnaire begins.
- The system needs a clear distinction between required inputs and optional refinements without making the CLI confusing.
- `aspectRatio` and explicit image-size tracking are now out of scope for the product and should be deleted rather than hidden.

## Locked Feature Request
- Required inputs:
  - `type`
  - `model`
  - `subject`
- Optional inputs selected by the user:
  - `style`
  - `scene`
  - `mood`
  - `composition`
  - `lighting`
  - `cameraLens`
  - `negativePrompt`
- The optional fields should appear only after the user picks them from a multi-select step.
- `aspectRatio` is not optional, not hidden, and not internally defaulted. It is deleted from the application contract.
- `width` and `height` are not replaced by a new internal concept in this feature. They are deleted from the application contract.

## Product Decisions to Lock Early
- The CLI should remain sequential and interactive-first.
- The optional-input chooser should happen only after the required fields are collected.
- Optional fields not selected by the user should be omitted from later prompts, not asked with defaults.
- The shared intermediate schema should use optional properties for optional fields; omitted means omitted.
- No deterministic defaults should be introduced for deleted fields. The app should not silently reintroduce `aspectRatio`, `width`, or `height` under a different name.
- The confirmation screen should clearly separate required answers from optional refinements the user chose to provide.
- Storage should delete `aspect_ratio`, `width`, and `height` columns rather than making them nullable.

## Recommended User Flow

### Required Phase
- Ask `type`.
- Ask `model`.
- Ask `subject`.

### Optional Selection Phase
- Show one checkbox-style multi-select prompt such as `Choose any additional inputs to refine this prompt`.
- Include all optional fields in that selector.
- Allow the user to continue with zero optional selections for a minimal prompt flow.

### Optional Question Phase
- Ask only the optional questions selected in the previous step.
- Preserve a stable order for optional questions so the flow remains predictable:
  - `style`
  - `scene`
  - `mood`
  - `composition`
  - `lighting`
  - `cameraLens`
  - `negativePrompt`

### Confirmation Phase
- Show:
  - required answers
  - chosen optional categories
  - selected values for the optional categories the user answered
- Omitted optional fields should stay hidden to keep the summary concise.
- Do not show `aspectRatio`, `width`, or `height`.

## Data Contract Decisions

### Raw Answers Shape
- `type`, `model`, and `subject` remain required.
- Optional fields are not mandatory on the raw answer type.
- The optional-input chooser should return a stable array such as `selectedOptionalInputs`.
- `aspectRatio` is removed from `RawAnswers`.

### Shared Schema Shape
- The shared intermediate schema keeps optional prompt refinements as optional properties.
- `aspectRatio` is removed from the intermediate schema.
- `negativePrompt` remains optional; when present it may be an empty list if the user selected the field but provided no exclusions.
- No replacement image-size fields are added to the domain schema.

### Normalized Output Shape
- Normalized output keeps prompt text only.
- `width` and `height` are removed from normalized output types and downstream consumers.

### Model Config Shape
- Model configs keep prompt-strategy and template data only.
- `aspectRatioMap` is removed from model config schema and JSON files.

### Storage Compatibility
- Prompt-run storage should keep only fields still present in the product contract.
- Delete `aspect_ratio`, `width`, and `height` from the database schema, storage types, row decoding, inserts, and history display.
- Compatibility means existing rows remain usable after migration without those columns; the application should not continue reading or exposing deleted fields.

## Required Code Areas
- `src/cli/collect-answers.ts` - change from fixed full questionnaire to phased required-plus-optional collection
- `src/cli/prompts.ts` - add a multi-select prompt for choosing optional input groups
- `src/cli/types.ts` - update raw answer types to support omitted optional fields and remove `aspectRatio`
- `src/cli/confirmation.ts` - show only required fields plus selected optional values; remove `aspectRatio`
- `src/config/index.ts` and `src/config/aspect-ratio-options.ts` - remove aspect-ratio exports/options
- `src/domain/schema.ts`, `src/domain/map-answers.ts`, `src/domain/prompt-intent.ts`, `src/domain/index.ts` - support partial optional inputs safely and remove `aspectRatio`
- `src/normalization/adapt.ts`, `src/normalization/types.ts`, `src/normalization/generate.ts` - ensure prompt generation handles missing optional refinements correctly and remove `width` / `height` from outputs
- `src/models/model-config-schema.ts` and `models/*/config.json` - remove image-size data from model configs
- `src/storage/types.ts`, `src/storage/mappers.ts`, `src/storage/schema.ts`, `src/storage/repositories/prompt-runs.ts`, `src/storage/migrations/` - remove `aspect_ratio`, `width`, and `height` from the storage contract
- `src/cli/history/display.ts` - remove deleted fields from history detail views
- `src/index.ts` - remove aspect-ratio lookup wiring and any assumptions about size-bearing outputs
- tests under `tests/unit/` and `tests/integration/` - cover new flow and remove assumptions about aspect ratio or explicit dimensions
- `README.md` - document required vs optional inputs and remove aspect-ratio / image-size references

## Implementation Plan

### Step 1: Lock Deletion and UX Decisions
- [x] Confirm the exact optional field list.
  - Optional fields (user-selectable): `style`, `scene`, `mood`, `composition`, `lighting`, `cameraLens`, `negativePrompt`.
- [x] Confirm whether zero optional selections are allowed.
  - Yes. The CLI must support a minimal flow where only `type`, `model`, and `subject` are collected.
- [x] Confirm how omitted optional fields should appear in the shared schema.
  - Collection layer (`RawAnswers`) and intermediate prompt schema treat optional fields as truly optional properties.
  - `negativePrompt` is optional; when omitted entirely, it means the user did not choose a negative prompt.
- [x] Confirm what happens to `aspectRatio`, `width`, and `height`.
  - They are fully removed from the application contract.
  - No internal fallback or replacement concept is introduced in this feature.
  - Model configs must not carry image-size data.
  - Database/storage must delete `aspect_ratio`, `width`, and `height`.
- [x] Confirm how confirmation and history views should present omitted fields.
  - Confirmation screen shows required answers and only the optional categories the user selected, with their values.
  - History/detail views omit optional fields that are absent.
  - Deleted fields are never displayed.
- **Tests:** None (decisions only). Documented here so later steps and tests assume a single contract.
- [x] Run full test suite; fix any regressions before proceeding to the next step. (Initial run after locking decisions should pass with no code changes yet.)

### Step 2: Introduce Optional Input Selection
- [x] Add a new checkbox prompt for selecting optional input groups.
- [x] Place it immediately after `type`, `model`, and `subject`.
- [x] Return a stable ordered list of selected optional field ids.
- [x] Validate that every selected id maps to a known optional prompt group.
- **Tests:**
  - [x] Unit tests: optional-input selection returns a stable ordered list of ids.
  - [x] Unit tests: every selected id maps to a known optional prompt group; invalid ids are rejected or normalized as decided.
- [x] Run full test suite; fix any regressions before proceeding to the next step.

### Step 3: Refactor Answer Collection and Confirmation
- [x] Update `collectAnswers()` so it asks only required questions first.
- [x] Iterate through the selected optional inputs in a fixed order.
- [x] Ask only the matching prompt functions for the chosen optional fields.
- [x] Update confirmation formatting to show required answers plus chosen optional values only.
- [x] Remove aspect-ratio prompt wiring, config lookups, and summary display.
- [x] Keep cancellation behavior unchanged and graceful.
- **Tests:**
  - [x] Unit tests: mapping from selected optional ids to prompt calls in fixed order.
  - [x] Unit tests: confirmation summary for required-only and chosen-subset flows.
- [x] Run full test suite; fix any regressions before proceeding to the next step.

### Step 4: Update Types, Schemas, and Mapping
- [x] Update raw answer types so optional fields are not mandatory.
- [x] Remove `aspectRatio` from raw/domain exports and schemas.
- [x] Update `zod` schemas to reflect the new partial-input contract.
- [x] Ensure the mapper from raw answers to intermediate schema handles omitted values explicitly.
- [x] Reject impossible states such as an optional field value being present when its field id was never selected, if that validation adds real safety.
- **Tests:**
  - [x] Unit tests: raw-answer mapping with only required fields present (minimal payload).
  - [x] Unit tests: raw-answer mapping with mixed required + subset of optional fields.
  - [x] Unit tests: schema accepts valid partial objects and rejects invalid ones per contract.
  - [x] Update existing `validRawAnswers` / invalid-case tests in `map-answers` and related specs for the new contract.
- [x] Run full test suite; fix any regressions before proceeding to the next step.

### Step 5: Remove Image-Size Data from Normalization and Model Config
- [x] Remove `aspectRatio` from intermediate prompt handling and prompt adaptation.
- [x] Remove `width` and `height` from normalized output types and generation results.
- [x] Remove `aspectRatioMap` from model config schema and model JSON files.
- [x] Ensure generated prompts remain coherent when only required fields are present.
- [x] Verify negative prompt generation still behaves correctly when `negativePrompt` is omitted versus selected but left empty.
- **Tests:**
  - [x] Unit tests: prompt generation with minimal input (required-only) produces coherent output.
  - [x] Unit tests: prompt generation with partial optional fields (e.g. mood + scene only) behaves as specified.
  - [x] Unit tests: `negativePrompt` omitted vs selected but empty gives correct behavior in generated prompt.
  - [x] Unit tests: model config loading passes without `aspectRatioMap`.
- [x] Run full test suite; fix any regressions before proceeding to the next step.

### Step 6: Remove Deleted Fields from Storage and History
- [x] Add a migration that drops `aspect_ratio`, `width`, and `height` from `prompt_runs`.
- [x] Update storage types, row decoding, repository SQL, and insert mapping to stop referencing deleted fields.
- [x] Ensure history detail screens no longer show deleted fields.
- [x] Preserve compatibility for existing prompt runs after migration without reading deleted columns.
- **Tests:**
  - [x] Unit tests: storage insert mapping with omitted optional fields still yields the expected payload.
  - [x] Unit tests: storage schema / row decoding matches the new row shape without deleted columns.
  - [x] Unit tests: history detail view omits deleted fields and handles absent optional selections cleanly.
  - [x] Integration tests: history/storage behavior after saving runs with minimal optional data using the new schema.
- [x] Run full test suite; fix any regressions before proceeding to the next step.

### Step 7: Integration and Cross-Cutting Tests
- [x] Integration tests: full interactive run with zero optional inputs (minimal flow).
- [x] Integration tests: full interactive run with a subset of optionals (e.g. `mood` and `scene` only).
- [x] Integration tests: history list and detail after saving runs with partial optional data.
- [x] Update existing integration tests (`full-pipeline`, `llm-cli-flow`, `llm-pipeline`, `error-scenarios`) to use the new answer shape.
- [x] Ensure no remaining tests assume aspect ratio, width/height, or fully populated prompt fields; fix or remove as needed.
- [x] Run full test suite; fix any regressions before proceeding to the next step.

### Step 8: Document the New Flow
- [x] Update `README.md` interactive flow documentation.
- [x] Document which inputs are required and which are optional.
- [x] Add an example of the optional selection step and a minimal-flow run.
- [x] Remove aspect-ratio and explicit image-size references from docs and examples.
- **Tests:** None (documentation only).
- [x] Run full test suite; fix any regressions before considering the feature complete.

## Suggested Deliverables
- [x] Interactive CLI with required-first questioning
- [x] Multi-select step for choosing optional input groups
- [x] Support for prompt generation with partially populated optional inputs
- [x] No remaining `aspectRatio` usage in the application code
- [x] No remaining explicit image-size data in model configs, normalized output, or storage
- [x] Tests for minimal and mixed optional-input flows
- [x] README updates for the new UX

## Risks and Decisions to Resolve Early
- [ ] Omitted optional fields may ripple through mapping, normalization, storage, and history code if the schema contract is not locked first.
- [ ] Existing tests likely assume all fields are always present and will need coordinated updates.
- [ ] Removing `width` / `height` from normalized output may affect any downstream code that still expects them.
- [ ] Storage migration must be coordinated carefully because it deletes columns rather than relaxing them.
- [ ] Dead exports, config modules, and fixtures may linger unless the cleanup pass is explicit.

## Recommended Implementation Order
- [x] Lock the deletion contract and required-vs-optional schema decisions
- [x] Add the optional-input multi-select prompt
- [x] Refactor collection, confirmation, and raw answer types
- [x] Update schema mapping and prompt generation
- [x] Remove image-size data from model configs and normalized output
- [x] Update storage and history handling
- [x] Add tests
- [x] Update README
