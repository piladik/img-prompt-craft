# Optional Input Selection Flow

## Objective
- Change the interactive CLI so `type`, `model`, and `subject` are always required, while the remaining inputs become optional and user-driven.
- Let the user choose which optional inputs they want to configure through a multi-select step before answering those optional questions.
- Keep one shared intermediate schema and avoid mixing model-specific behavior into the CLI question flow.

## Current Relevant State
- The CLI currently asks every prompt field in a fixed linear order.
- `collectAnswers()` always collects `style`, `scene`, `mood`, `aspectRatio`, `composition`, `lighting`, `cameraLens`, and `negativePrompt`, even when the user does not care about all of them.
- The shared schema and generation pipeline expect a complete answer object today.
- Prompt history storage also assumes that all selection fields are present in saved prompt runs.

## Problem to Solve
- The current flow asks too many questions for simple prompt-building sessions.
- Users cannot express "only ask me for a few optional refinements" before the questionnaire begins.
- The system needs a clear distinction between required inputs and optional refinements without making the CLI confusing.

## Locked Feature Request
- Required inputs:
  - `type`
  - `model`
  - `subject`
- Optional inputs selected by the user:
  - `style`
  - `scene`
  - `mood`
  - `aspectRatio`
  - `composition`
  - `lighting`
  - `cameraLens`
  - `negativePrompt`
- The optional fields should appear only after the user picks them from a multi-select step.

## Product Decisions to Lock Early
- The CLI should remain sequential and interactive-first.
- The optional-input chooser should happen only after the required fields are collected.
- Optional fields not selected by the user should be omitted from later prompts, not asked with defaults.
- The shared intermediate schema must define how omitted fields are represented: nullable, optional, or filled by deterministic defaults.
- The confirmation screen should clearly separate required answers from optional refinements the user chose to provide.

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
  - `aspectRatio`
  - `composition`
  - `lighting`
  - `cameraLens`
  - `negativePrompt`

### Confirmation Phase
- Show:
  - required answers
  - chosen optional categories
  - selected values for the optional categories the user answered
- Make omitted optional fields explicit only if that improves clarity; otherwise keep the summary concise.

## Data Contract Decisions

### Raw Answers Shape
- `type`, `model`, and `subject` remain required.
- Optional fields should no longer be required in the raw answer type.
- The optional-input chooser should likely return a stable array such as `selectedOptionalInputs`.

### Shared Schema Shape
- Decide one of these approaches before implementation:
  - optional properties on the shared schema
  - nullable properties on the shared schema
  - deterministic defaults applied after collection but before normalization
- Recommended direction:
  - keep the collection layer honest with optional fields truly optional
  - add a normalization step that applies explicit defaults only where the generation pipeline truly needs them

### Storage Compatibility
- Prompt history needs a clear storage rule for omitted optional values.
- Recommended rule:
  - store omitted optional selections as `NULL` in PostgreSQL where the schema allows it
  - avoid inventing fake placeholder values just to satisfy storage

## Required Code Areas
- `src/cli/collect-answers.ts` - change from fixed full questionnaire to phased required-plus-optional collection
- `src/cli/prompts.ts` - add a multi-select prompt for choosing optional input groups
- `src/cli/types.ts` - update raw answer types to support omitted optional fields
- `src/domain/` mapping and schema modules - support partial optional inputs safely
- `src/normalization/` - ensure prompt generation handles missing optional refinements correctly
- `src/storage/` - confirm insert mapping and row decoding handle nullable optional selections
- tests under `tests/unit/` and `tests/integration/` - cover new flow and backward-safe behavior

## Implementation Plan

### Step 1: Lock Schema and UX Decisions
- [ ] Confirm the exact optional field list.
- [ ] Confirm whether zero optional selections are allowed. Recommended: yes.
- [ ] Confirm how omitted optional fields should appear in the shared schema.
- [ ] Confirm whether any optional fields should gain deterministic defaults.
- [ ] Confirm how confirmation and history views should present omitted fields.

### Step 2: Introduce Optional Input Selection
- [ ] Add a new checkbox prompt for selecting optional input groups.
- [ ] Place it immediately after `type`, `model`, and `subject`.
- [ ] Return a stable ordered list of selected optional field ids.
- [ ] Validate that every selected id maps to a known optional prompt group.

### Step 3: Refactor Answer Collection
- [ ] Update `collectAnswers()` so it asks only required questions first.
- [ ] Iterate through the selected optional inputs in a fixed order.
- [ ] Ask only the matching prompt functions for the chosen optional fields.
- [ ] Keep cancellation behavior unchanged and graceful.

### Step 4: Update Types and Validation
- [ ] Update raw answer types so optional fields are not mandatory.
- [ ] Update `zod` schemas to reflect the new contract.
- [ ] Ensure the mapper from raw answers to intermediate schema handles omitted values explicitly.
- [ ] Reject impossible states such as an optional field value being present when its field id was never selected, if that validation adds real safety.

### Step 5: Update Prompt Generation Rules
- [ ] Review deterministic prompt assembly for missing optional data.
- [ ] Ensure generated prompts remain coherent when only required fields are present.
- [ ] Decide how prompt ordering works when many optional fields are omitted.
- [ ] Verify negative prompt generation still behaves correctly when `negativePrompt` is omitted versus selected but left empty.

### Step 6: Update History and Storage
- [ ] Confirm storage columns for optional selections accept `NULL` where appropriate.
- [ ] Update mapping from answers to storage insert payloads for omitted optional fields.
- [ ] Ensure history detail screens display missing optional selections cleanly, for example `Not provided` or by omitting empty rows.
- [ ] Preserve compatibility with previously saved records that contain all fields.

### Step 7: Add Tests
- [ ] Add unit tests for optional-input selection ordering and validation.
- [ ] Add unit tests for raw-answer mapping with only required fields present.
- [ ] Add unit tests for mixed required-plus-optional scenarios.
- [ ] Add integration tests for an interactive run with zero optional inputs.
- [ ] Add integration tests for an interactive run with a subset such as `mood` and `scene` only.
- [ ] Add integration tests for history/storage behavior when optional values are absent.

### Step 8: Document the New Flow
- [ ] Update `README.md` interactive flow documentation.
- [ ] Document which inputs are required and which are optional.
- [ ] Add an example of the optional selection step and a minimal-flow run.

## Suggested Deliverables
- [ ] Interactive CLI with required-first questioning
- [ ] Multi-select step for choosing optional input groups
- [ ] Support for prompt generation with partially populated optional inputs
- [ ] History and storage behavior for omitted optional selections
- [ ] Tests for minimal and mixed optional-input flows
- [ ] README updates for the new UX

## Risks and Decisions to Resolve Early
- [ ] Omitted optional fields may ripple through mapping, normalization, storage, and history code if the schema contract is not locked first.
- [ ] Applying defaults too early may blur the difference between "user selected this" and "system filled this in."
- [ ] Applying no defaults at all may reduce prompt quality unless the prompt builder is updated carefully.
- [ ] Existing tests likely assume all fields are always present and will need coordinated updates.
- [ ] Storage migrations may be required if optional columns are currently non-nullable.

## Recommended Implementation Order
- [ ] Lock required-vs-optional schema decisions
- [ ] Add the optional-input multi-select prompt
- [ ] Refactor collection and raw answer types
- [ ] Update schema mapping and prompt generation
- [ ] Update storage and history handling
- [ ] Add tests
- [ ] Update README
