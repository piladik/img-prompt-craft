# Interactive Prompt Normalization CLI

## Objective
- Build an interactive Node.js CLI that helps the user assemble a structured image-generation prompt for ComfyUI.
- Start with one MVP flow for `image` prompts only.
- Use one shared intermediate schema first, then transform that schema into model-specific output using per-model rules.
- Keep the system easy to extend later for more models, more styles, and eventually video prompts.

## MVP Scope
- Prompt type: `image`
- Model options: `flux`
- Style options: 5 predefined options
- Subject options: `young woman`, `young man`
- Scene options: 5 predefined options
- Mood options: 5 predefined options
- Aspect ratio options: 5 predefined options
- Composition options: 5 predefined options
- Lighting options: 5 predefined options
- Camera / lens options: 5 predefined options
- Negative prompt: multi-select with 10 predefined options tuned for realistic human images
- Output: one normalized object plus one final model-ready prompt string
- Model-specific output examples: one file per model that documents the expected final output structure

## Recommended Stack
- Runtime: Node.js 22+
- Language: TypeScript
- Module system: native ESM
- CLI prompt library: `@inquirer/prompts`
- Validation: `zod`
- Config format for model rules and presets: `json` for data, `ts` for typed loaders if needed
- Test runner: `vitest`
- Dev runner: `tsx`
- Formatting and linting: `prettier` and `eslint`

## Why This Stack
- Node.js + TypeScript gives fast iteration and easy package distribution for a CLI.
- `@inquirer/prompts` is a good fit for guided interactive flows and supports select and checkbox prompts cleanly.
- `zod` keeps the shared schema, model config loading, and LLM output validation strict.
- `vitest` is lightweight and works well for both unit tests and CLI-oriented integration tests.
- `tsx` keeps local development simple without adding a heavy build step early.

## Proposed Project Structure
- `src/index.ts` - CLI entry point
- `src/cli/` - interactive prompt flow and terminal output helpers
- `src/domain/` - shared prompt schema, types, and deterministic transforms
- `src/models/` - model registry, model loaders, and model-specific adapters
- `src/normalization/` - normalization pipeline and LLM integration
- `src/config/` - static option lists and app configuration
- `src/utils/` - small pure helpers
- `models/flux/` - Flux model rules, examples, and prompt templates
- `tests/unit/` - schema, transforms, loaders, and prompt builders
- `tests/integration/` - end-to-end CLI flow tests

## Shared MVP Input Set

### Required User Selections
- `type`: `image`
- `model`: `flux`
- `style`: 1 of 5 predefined options
- `subject`: `young woman` or `young man`
- `scene`: 1 of 5 predefined options
- `mood`: 1 of 5 predefined options
- `aspectRatio`: 1 of 5 predefined options
- `composition`: 1 of 5 predefined options
- `lighting`: 1 of 5 predefined options
- `cameraLens`: 1 of 5 predefined options
- `negativePrompt`: 0 to many selections from 10 predefined options

### Locked MVP Preset Lists
- Styles:
  - cinematic realism
  - fashion editorial
  - natural lifestyle photography
  - dark moody portrait
  - luxury commercial photo
- Scenes:
  - modern city street
  - cozy cafe interior
  - luxury studio backdrop
  - rooftop at sunset
  - minimalist apartment interior
- Moods:
  - confident
  - mysterious
  - relaxed
  - romantic
  - dramatic
- Aspect ratios:
  - `1:1`
  - `4:5`
  - `3:4`
  - `16:9`
  - `9:16`
- Compositions:
  - close-up portrait
  - head-and-shoulders portrait
  - medium shot
  - full-body shot
  - candid over-the-shoulder
- Lighting:
  - soft natural daylight
  - golden hour sunlight
  - dramatic studio lighting
  - neon night lighting
  - soft window light
- Camera / lens:
  - `35mm documentary look`
  - `50mm natural perspective`
  - `85mm portrait lens`
  - `24mm environmental portrait`
  - `70-200mm compressed fashion look`
- Negative prompt options:
  - blurry
  - low detail skin
  - bad anatomy
  - deformed hands
  - extra fingers
  - asymmetrical eyes
  - unnatural face
  - waxy skin
  - text watermark
  - jpeg artifacts

## Shared Output Design

### Intermediate Schema Goal
- Every model adapter should receive the same validated intermediate structure.
- The CLI should not branch into model-specific prompt-building logic.
- The final prompt generation step should depend on model files, not on interactive prompt flow code.

### Suggested Intermediate Schema Fields
- `type`
- `model`
- `style`
- `subject`
- `scene`
- `mood`
- `aspectRatio`
- `composition`
- `lighting`
- `cameraLens`
- `negativePrompt`
- `promptIntent` - deterministic human-readable summary assembled from selections
- `metadata` - timestamps, app version, or other debug fields if needed

### Final Output Goal
- `intermediate`: validated shared schema object
- `normalized`: model-specific prompt object
- `prompt`: final positive prompt string
- `negativePrompt`: final negative prompt string

## Step-by-Step Plan

### Step 1: Lock MVP Product Decisions
- [X] Confirm that the first release supports `image` only.
- [X] Confirm that `flux` is the only supported model in MVP.
- [X] Confirm the exact 5 options for style, scene, mood, aspect ratio, composition, lighting, and camera / lens.
- [X] Confirm the exact 10 negative prompt options for realistic human images.
- [X] Decide whether the CLI should show all selections in a confirmation screen before generating output.
- [X] Decide whether the CLI should allow restarting the full flow after confirmation.
- [X] Decide whether the first release outputs to terminal only or also saves JSON/text files.

### Step 1 Decisions
- Prompt type support in MVP is locked to `image`.
- Model support in MVP is locked to `flux`.
- The preset lists in `Locked MVP Preset Lists` are the source of truth for the first implementation pass.
- The CLI will show a confirmation screen with all selected values before output generation.
- After confirmation, the CLI will support restarting the full flow instead of forcing the user to exit.
- The first release will output to terminal only.
- File export support for JSON or text can be added in a later step after the core interactive flow is stable.

### Step 2: Define the End-to-End User Flow
- [X] Write the full interactive question order.
- [X] Decide which prompt types use single-select and which use multi-select.
- [X] Define clear labels and internal values for each option.
- [X] Define cancellation behavior for `Ctrl+C` or escape cases.
- [X] Define retry behavior if generation fails after the user completes the flow.
- [X] Define the final terminal output layout:
  - selected values summary
  - positive prompt
  - negative prompt
  - normalized JSON if debug mode is enabled
- [X] Decide whether to include a final "generate again" or "exit" choice.

### Step 2 Decisions

#### Interactive Question Order
- `type`
- `model`
- `style`
- `subject`
- `scene`
- `mood`
- `aspectRatio`
- `composition`
- `lighting`
- `cameraLens`
- `negativePrompt`
- `confirmation`
- `postGenerationAction`

#### Prompt Type by Step
- Single-select:
  - `type`
  - `model`
  - `style`
  - `subject`
  - `scene`
  - `mood`
  - `aspectRatio`
  - `composition`
  - `lighting`
  - `cameraLens`
  - `confirmation`
  - `postGenerationAction`
- Multi-select:
  - `negativePrompt`

#### Label and Value Rules
- Every selectable option will have a human-friendly `label` and a stable machine-friendly `value`.
- Labels are used in the terminal UI.
- Values are used in the raw answers object, shared schema mapping, tests, and model adapters.
- Value naming rules:
  - lowercase
  - words separated by hyphens
  - no punctuation other than hyphens and digits when needed
  - stable once introduced to avoid breaking snapshots and config lookups

#### Locked Internal Value Shape
- `type`: `image`
- `model`: `flux`
- `style` values:
  - `cinematic-realism`
  - `fashion-editorial`
  - `natural-lifestyle-photography`
  - `dark-moody-portrait`
  - `luxury-commercial-photo`
- `subject` values:
  - `young-woman`
  - `young-man`
- `scene` values:
  - `modern-city-street`
  - `cozy-cafe-interior`
  - `luxury-studio-backdrop`
  - `rooftop-at-sunset`
  - `minimalist-apartment-interior`
- `mood` values:
  - `confident`
  - `mysterious`
  - `relaxed`
  - `romantic`
  - `dramatic`
- `aspectRatio` values:
  - `1:1`
  - `4:5`
  - `3:4`
  - `16:9`
  - `9:16`
- `composition` values:
  - `close-up-portrait`
  - `head-and-shoulders-portrait`
  - `medium-shot`
  - `full-body-shot`
  - `candid-over-the-shoulder`
- `lighting` values:
  - `soft-natural-daylight`
  - `golden-hour-sunlight`
  - `dramatic-studio-lighting`
  - `neon-night-lighting`
  - `soft-window-light`
- `cameraLens` values:
  - `35mm-documentary-look`
  - `50mm-natural-perspective`
  - `85mm-portrait-lens`
  - `24mm-environmental-portrait`
  - `70-200mm-compressed-fashion-look`
- `negativePrompt` values:
  - `blurry`
  - `low-detail-skin`
  - `bad-anatomy`
  - `deformed-hands`
  - `extra-fingers`
  - `asymmetrical-eyes`
  - `unnatural-face`
  - `waxy-skin`
  - `text-watermark`
  - `jpeg-artifacts`

#### Flow Contract
- The CLI asks one question at a time in a linear sequence.
- Each answer is collected and stored before moving to the next step.
- `negativePrompt` allows zero selections so the user can continue without a negative prompt.
- After the last content question, the CLI shows a confirmation screen with all selected labels.
- The confirmation screen offers:
  - `generate`
  - `restart`
  - `cancel`
- If the user chooses `restart`, the entire flow starts from the first question.
- If the user chooses `cancel`, the CLI exits cleanly without generating output.

#### Cancellation Behavior
- If the user presses `Ctrl+C` during any prompt, the CLI exits gracefully.
- The exit message should be short and friendly, for example: `Prompt generation cancelled.`
- Cancellation should not print stack traces in normal mode.
- Partial answers should not be written to disk in MVP because MVP is terminal-only.
- Escape-key-specific behavior is not required for MVP unless the chosen prompt library supports it consistently across prompt types.

#### Retry Behavior After Generation Failure
- If prompt generation fails after the user completes the flow, the CLI should show:
  - a concise error summary
  - one recovery action prompt
- Recovery action options:
  - `retry-generation`
  - `restart-flow`
  - `exit`
- `retry-generation` reruns the generation step using the same validated answers.
- `restart-flow` starts the full questionnaire from the first step.
- `exit` ends the process with a non-zero exit code.
- Validation errors discovered before generation should not use retry-generation; they should route the user back into restart flow behavior.

#### Final Terminal Output Layout
- Section 1: `Selections`
  - show the final chosen labels for all fields
- Section 2: `Positive Prompt`
  - show the generated model-ready positive prompt string
- Section 3: `Negative Prompt`
  - show the generated negative prompt string, or `None` when no negative prompt options were selected
- Section 4: `Normalized Output`
  - show the normalized JSON object only when debug mode is enabled
- Output formatting rules:
  - concise headings
  - no noisy logs in normal mode
  - stable order of fields for readability and testing

#### Post-Generation Choice
- After a successful generation, the CLI will show a final action prompt.
- Final action options:
  - `generate-again`
  - `exit`
- `generate-again` restarts the full flow from the first question.
- `exit` ends the process cleanly with a success code.

### Step 3: Initialize the Node.js CLI Project
- [X] Create `package.json` with Node.js and TypeScript tooling.
- [X] Add `typescript`, `tsx`, `vitest`, `zod`, and `@inquirer/prompts`.
- [X] Add `eslint` and `prettier`.
- [X] Configure ESM-friendly TypeScript settings.
- [X] Add scripts for:
  - `dev`
  - `build`
  - `start`
  - `test`
  - `test:watch`
- [X] Create the base `src/` and `tests/` directories.
- [X] Create a minimal executable entry point for local development.

### Step 4: Create Static Preset Data
- [X] Create a config module for each selectable preset group.
- [X] Store both `label` and `value` for each option.
- [X] Keep all option lists centralized so the CLI and tests reuse the same source.
- [X] Add validation to ensure there are no duplicate values.
- [X] Add tests that verify option counts and expected allowed values.

### Step 5: Design the Shared Intermediate Schema
- [X] Define TypeScript types for all user selections.
- [X] Define `zod` schemas for the same structure.
- [X] Mark which fields are required.
- [X] Decide whether `negativePrompt` is always present as an array, even when empty.
- [X] Add derived fields such as `promptIntent` only if they are deterministic and useful.
- [X] Add unit tests for valid and invalid schema examples.

### Step 5 Decisions
- All fields are required. `negativePrompt` is always an array, empty when the user skips that step.
- `promptIntent` is a deterministic human-readable sentence assembled from selections, not LLM-generated.
- `metadata` contains `createdAt` (ISO 8601 datetime) and `appVersion`.
- Types are inferred from zod schemas to keep a single source of truth.

### Step 6: Build the Interactive CLI Prompt Layer
- [X] Create one prompt function per question group.
- [X] Implement the `image` prompt type selection first, even if it has one option, so the flow is future-ready.
- [X] Implement the model selection with one visible Flux option.
- [X] Implement all remaining single-select steps.
- [X] Implement the negative prompt checkbox step for multi-select.
- [X] Add a confirmation screen that summarizes all answers before generation.
- [X] Return one raw answers object from the CLI layer.
- [X] Keep the CLI layer focused on gathering input only, not building prompts.

### Step 7: Transform Raw Answers into the Shared Schema
- [X] Create a mapper that converts raw prompt answers into the intermediate schema.
- [X] Normalize field names and output shape.
- [X] Trim or sanitize values where appropriate.
- [X] Validate the mapped object with `zod`.
- [X] Return typed results or explicit validation errors.
- [X] Add unit tests for successful and failing mappings.

### Step 8: Define the Model File Contract
- [X] Create one directory per model under `models/`.
- [X] For Flux, create:
  - a rules file
  - an output example file
  - optional prompt template text
- [X] Decide the exact shape of a model definition file:
  - model id
  - human label
  - prompting guidance
  - output structure description
  - normalization instructions
- [X] Document how the application locates and loads the selected model files.
- [X] Validate model config files on startup or on first load.

### Step 9: Create the Flux Model Adapter
- [X] Implement a Flux adapter that accepts the shared intermediate schema.
- [X] Define any Flux-specific prompt preferences such as natural-language phrasing.
- [X] Ensure the adapter does not change the shared schema contract.
- [X] Produce a normalized model-ready object shape.
- [X] Add tests for the Flux adapter using representative user selections.

### Step 10: Build the Normalization Layer
- [X] Decide whether MVP uses deterministic string assembly only, LLM normalization only, or a hybrid pipeline.
- [X] If using deterministic generation:
  - define prompt ordering rules
  - define separators and formatting rules
  - define how negative prompts are joined
- [X] If using LLM normalization:
  - define the input payload sent to the model
  - define the system prompt and model rules merge strategy
  - define response validation requirements
- [X] Keep the API between the shared schema and normalization layer stable.
- [X] Add tests for expected positive and negative prompt generation.

### Step 10 Decisions
- MVP uses deterministic string assembly only. No LLM normalization in the first release.
- The `generatePrompt` pipeline orchestrates: raw answers → schema mapping → model config loading → adapter → final output.
- Errors are tagged by stage (`mapping`, `model-loading`, `adaptation`) so the CLI can show targeted recovery actions.
- LLM normalization can be added later as an optional post-processing step without changing the pipeline contract.

### Step 11: Implement Model Rules Loading
- [X] Create a registry of supported models.
- [X] Resolve the selected model id to the correct directory and files.
- [X] Load the model rules file safely.
- [X] Validate loaded model config with `zod`.
- [X] Return actionable errors for missing or invalid files.
- [X] Add tests for successful loading and failure cases.

### Step 11 Note
- All Step 11 work was completed during Step 8 (model file contract) and Step 10 (pipeline integration).
- Registry: `src/models/registry.ts`
- Loader: `src/models/load-model-config.ts`
- Schema: `src/models/model-config-schema.ts`
- Tests: `tests/unit/model-config.test.ts` (14 tests)

### Step 12: Wire the Full CLI Orchestration
- [X] Connect interactive prompts to raw answers collection.
- [X] Map answers into the shared schema.
- [X] Load the selected model definition.
- [X] Run normalization for the selected model.
- [X] Print the output using a readable terminal layout.
- [X] Exit with a success code on completion.
- [X] Exit with a non-zero code on recoverable or fatal failures as appropriate.

### Step 13: Add Error Handling and Safe Exits
- [X] Handle user cancellation cleanly.
- [X] Handle invalid answer mapping errors.
- [X] Handle missing model files.
- [X] Handle malformed model file content.
- [X] Handle LLM or network failures if LLM normalization is used.
- [X] Show concise recovery-oriented messages instead of stack traces in normal mode.
- [X] Add an optional debug mode for verbose diagnostics.

### Step 13 Details
- `Ctrl+C` exits gracefully with a friendly message at any prompt.
- Mapping-stage errors (invalid user selections) skip the retry option and offer only restart or exit.
- Model-loading and adaptation errors offer retry, restart, or exit.
- Startup validates all registered model configs before entering the interactive flow — catches missing or malformed files immediately.
- Debug mode (`--debug` flag or `DEBUG=1` env var) prints full intermediate schema and normalized output JSON.
- No LLM in MVP, so network failure handling is deferred to the future LLM feature.
- All error paths show concise messages without stack traces in normal mode.

### Step 14: Test the MVP Thoroughly
- [X] Unit test all preset lists.
- [X] Unit test schema validation.
- [X] Unit test raw-answer-to-schema mapping.
- [X] Unit test Flux adapter behavior.
- [X] Unit test model config loading.
- [X] Unit test prompt normalization and output assembly.
- [X] Add at least one end-to-end interactive flow test for a successful run.
- [X] Add end-to-end tests for cancellation and invalid model config scenarios.

### Step 15: Document the MVP
- [X] Write a `README` with the project goal and MVP scope.
- [X] Document installation and local development commands.
- [X] Document the interactive flow and supported selections.
- [X] Show an example output for the Flux model.
- [X] Document how model files are structured.
- [X] Document how to add a new model in the future.

## Deliverables for MVP Completion
- [X] A working interactive CLI runnable locally with Node.js
- [X] A complete image-only MVP flow using Flux
- [X] Shared intermediate schema with runtime validation
- [X] Flux model rules and output example file
- [X] Positive prompt and negative prompt generation
- [X] Tests for the main happy path and core failure paths
- [X] Basic developer documentation

## Risks and Decisions to Resolve Early
- [X] Decide whether MVP prompt generation is deterministic, LLM-based, or hybrid.
- [X] Decide whether model rules files should be plain JSON, YAML, or typed TS modules.
- [X] Decide how strict the final model-ready output schema should be.
- [X] Decide whether future video support should share the same root schema with a discriminated union.
- [X] Decide whether the CLI should eventually support saved presets and history.

### Resolved Decisions
- MVP uses deterministic string assembly only. LLM normalization is a future feature (see `roadmap-future.md`).
- Model rules files are plain JSON, validated with zod at load time.
- The final output schema is strict: `positivePrompt`, `negativePrompt`, `width`, `height`.
- Video support and saved presets are deferred to post-MVP.

## Suggested Implementation Order
- [X] Finalize preset options and MVP decisions
- [X] Initialize project and install core dependencies
- [X] Add static preset config modules
- [X] Add shared types and `zod` schema
- [X] Build interactive CLI question flow
- [X] Implement raw answers to schema mapping
- [X] Add Flux model files and loader
- [X] Implement prompt normalization
- [X] Wire end-to-end CLI orchestration
- [X] Add tests
- [X] Add docs
