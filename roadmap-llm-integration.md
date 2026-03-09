# LLM Prompt Normalization Integration

## Objective
- Add an optional LLM-powered normalization step that rewrites the deterministic prompt into higher-quality, model-optimized natural language.
- The deterministic pipeline stays as the default and fallback; LLM normalization is an opt-in enhancement.
- Keep the integration modular so that different LLM models available through OpenRouter can be swapped without changing the pipeline contract.

## Why
- Deterministic template filling produces predictable but sometimes stiff prompts.
- An LLM can rephrase the prompt into more natural, expressive language that image models respond to better.
- Different models benefit from different phrasing styles — an LLM can adapt tone, word choice, and structure per model.
- The existing `promptGuidance` field in model configs is already defined but unused — LLM normalization gives it a purpose.

## Scope
- LLM normalization is opt-in via a `--llm` CLI flag or an interactive toggle during the flow.
- When enabled, the LLM receives the intermediate schema + deterministic prompt + model-specific guidance and returns a rewritten positive prompt.
- The negative prompt is NOT rewritten by the LLM — it stays deterministic.
- The pipeline contract (`GenerationResult`, `NormalizedOutput`) does not change shape.
- Fallback to deterministic output is automatic on LLM failure.
- LLM access via OpenRouter API gateway (`gpt-5.4` as the default model). OpenRouter provides a single API key for accessing models from OpenAI, Anthropic, and others — no need for per-provider keys.

## Prerequisites
- Completed MVP (`roadmap-mvp.md` — all steps done).
- An OpenRouter API key for development and testing (https://openrouter.ai/keys).

## Architecture Overview

### Current Pipeline
```
RawAnswers → mapAnswersToSchema() → IntermediatePrompt → loadModelConfig() → adaptToModel() → NormalizedOutput
```

### Pipeline With LLM Normalization
```
RawAnswers → mapAnswersToSchema() → IntermediatePrompt → loadModelConfig() → adaptToModel() → NormalizedOutput
                                                                                                      │
                                                                                              (if --llm enabled)
                                                                                                      │
                                                                                                      ▼
                                                                                          normalizeWithLlm()
                                                                                                      │
                                                                                                      ▼
                                                                                          NormalizedOutput (positivePrompt replaced)
```

### Where the LLM Step Slots In
- After `adaptToModel()` produces a deterministic `NormalizedOutput`.
- Before final output display.
- The LLM receives the deterministic positive prompt as a starting point, plus the full intermediate schema and model config guidance.
- On success, `output.positivePrompt` is replaced by the LLM version.
- On failure, the deterministic prompt is kept and a warning is shown.

### New Module: `src/llm/`
- `src/llm/index.ts` — public API exports
- `src/llm/client.ts` — LLM provider client abstraction and factory
- `src/llm/normalize.ts` — `normalizeWithLlm()` orchestrator
- `src/llm/build-system-prompt.ts` — per-model system prompt builder
- `src/llm/response-validation.ts` — zod-based validation of LLM responses
- `src/llm/config.ts` — provider configuration, env var loading, defaults
- `src/llm/types.ts` — shared types for the LLM module

### New Model Files
- `models/<id>/llm-prompt.txt` — per-model system prompt template for LLM normalization

### Affected Existing Files
- `src/normalization/generate.ts` — add optional LLM normalization call after `adaptToModel()`
- `src/normalization/types.ts` — add `normalizedBy` field to output or metadata
- `src/index.ts` — parse `--llm` flag, pass LLM config into pipeline
- `src/cli/display.ts` — show normalization mode indicator in output
- `src/domain/schema.ts` — extend metadata with `normalizedBy`
- `package.json` — add LLM client dependency

## Recommended Stack Additions
- LLM client: `openai` npm package — OpenRouter exposes an OpenAI-compatible API, so the official SDK works out of the box when configured with OpenRouter's base URL (`https://openrouter.ai/api/v1`)
- Default model: `openai/gpt-5.4` (via OpenRouter model identifier)
- No additional test mocking library needed — `vitest` mock support is sufficient

## LLM System Prompt Design

### System Prompt Structure (Per Model)
```
You are a prompt engineer specializing in {model.label} image generation.

Model guidance:
{model.promptGuidance}

Your task:
Rewrite the following deterministic prompt into a higher-quality, expressive natural-language prompt optimized for {model.label}.

Rules:
- Preserve ALL details from the original: subject, scene, mood, style, composition, lighting, and camera lens.
- Do NOT add subjects, objects, or scene elements that are not present in the original.
- Do NOT include negative prompt instructions in the positive prompt.
- Write as a single flowing description, not a comma-separated tag list.
- Keep the output under {maxLength} characters.
- Return ONLY the rewritten prompt text, no explanations or metadata.
```

### User Prompt Structure
```
Original prompt: {deterministicPositivePrompt}

User selections:
- Style: {style}
- Subject: {subject}
- Scene: {scene}
- Mood: {mood}
- Composition: {composition}
- Lighting: {lighting}
- Camera/Lens: {cameraLens}
```

### Why This Structure
- The system prompt carries the model-specific guidance from `config.json` and the rewriting rules.
- The user prompt carries the concrete selections so the LLM knows exactly what must be preserved.
- Separating system and user prompts allows per-model customization without changing the orchestration code.

## LLM Response Validation

### Validation Rules
- Response must be a non-empty string.
- Response must not exceed `maxPromptLength` (configurable, default 500 characters).
- Response must contain at least one word from the original subject selection (e.g., "woman" or "man").
- Response must not contain common hallucination markers: instructions to the LLM, markdown formatting, or quoted metadata.

### Validation Schema
```ts
const llmResponseSchema = z.object({
  rewrittenPrompt: z.string()
    .min(1)
    .max(maxPromptLength)
    .refine(containsSubject, { message: 'LLM response must reference the original subject' })
    .refine(noMetadata, { message: 'LLM response must not contain metadata or instructions' }),
});
```

### On Validation Failure
- Log the failure reason in debug mode.
- Fall back to the deterministic prompt silently in normal mode.
- Count as a failed attempt for retry logic.

## Configuration

### Environment Variables
- `OPENROUTER_API_KEY` — required when `--llm` is used
- `LLM_MODEL` — optional, defaults to `openai/gpt-5.4`; any model available on OpenRouter can be used (e.g. `anthropic/claude-sonnet-4`, `google/gemini-2.5-pro`)
- `LLM_MAX_PROMPT_LENGTH` — optional, defaults to `500`
- `LLM_TIMEOUT_MS` — optional, defaults to `15000`

### Startup Validation
- When `--llm` is passed, validate that `OPENROUTER_API_KEY` is set before entering the interactive flow.
- Show a clear error message if the key is missing: `LLM mode requires OPENROUTER_API_KEY. Get one at https://openrouter.ai/keys or use deterministic mode.`

## Step-by-Step Plan

### Step 1: Lock LLM Integration Product Decisions
- [X] Confirm that LLM normalization only rewrites the positive prompt, not the negative prompt.
- [X] Confirm that LLM normalization is opt-in via `--llm` flag.
- [X] Confirm that the deterministic prompt is always generated first and used as fallback.
- [X] Confirm that OpenRouter is the API gateway and `openai/gpt-5.4` is the default model.
- [X] Confirm retry policy: 1 retry on LLM failure, then fall back to deterministic.
- [X] Confirm the `GenerationResult` shape does not change — only a `normalizedBy` metadata field is added.
- [X] Decide whether to add an interactive question asking the user to choose normalization mode, or only support the `--llm` flag.
- [X] Decide maximum acceptable latency for LLM call before timeout.

### Step 1 Decisions
- LLM normalization rewrites the positive prompt only. The negative prompt stays deterministic because it is a curated safety/quality list that should not be rephrased.
- LLM mode is activated exclusively via the `--llm` CLI flag. No interactive toggle question in the first release — this keeps the prompt flow identical for both modes and avoids confusion when no API key is set. An interactive toggle can be added later if user feedback requests it.
- The deterministic prompt is always generated first. It serves as both the LLM's input reference and the automatic fallback if the LLM call fails or validation rejects the response.
- OpenRouter is the sole API gateway. The default model is `openai/gpt-5.4`, overridable via `LLM_MODEL` env var. No per-provider abstraction is needed because OpenRouter handles provider routing.
- Retry policy: 1 automatic retry on any LLM failure (network, timeout, or response validation). After the second failure, fall back to the deterministic prompt silently in normal mode, with the failure reason logged in debug mode.
- The `GenerationResult` union shape is unchanged. `GenerationSuccess` gains one new field: `normalizedBy: 'deterministic' | 'llm'`. No new discriminated union variants are introduced.
- Maximum LLM call latency before timeout: 15 seconds (`LLM_TIMEOUT_MS` defaults to `15000`). This is generous enough for longer model responses through OpenRouter while keeping the CLI responsive.

### Step 2: Add LLM Client Dependency and OpenRouter Integration
- [X] Install `openai` npm package (used as the HTTP client — OpenRouter exposes an OpenAI-compatible API).
- [X] Create `src/llm/types.ts` with shared types:
  - `LlmConfig` interface (apiKey, model, baseUrl, timeout, maxPromptLength)
  - `LlmNormalizationResult` — success with rewritten prompt or failure with reason
- [X] Create `src/llm/config.ts`:
  - Load config from env vars (`OPENROUTER_API_KEY`, `LLM_MODEL`, etc.)
  - Set `baseUrl` to `https://openrouter.ai/api/v1`
  - Set default model to `openai/gpt-5.4`
  - Validate that `OPENROUTER_API_KEY` is present
  - Return typed `LlmConfig` or validation error
- [X] Create `src/llm/client.ts`:
  - Define `LlmClient` interface with a single `complete(systemPrompt, userPrompt)` method
  - Implement `OpenRouterClient` class using the `openai` package configured with OpenRouter's base URL and the `HTTP-Referer` / `X-Title` headers recommended by OpenRouter
  - Implement a `createLlmClient(config)` factory function
- [X] Add unit tests for config loading (valid, missing key, custom model override).

### Step 3: Create Per-Model LLM System Prompt Templates
- [X] Create `models/flux/llm-prompt.txt` with the system prompt template for Flux.
- [X] Define placeholder syntax for the template: `{model.label}`, `{model.promptGuidance}`, `{maxLength}`.
- [X] Create `src/llm/build-system-prompt.ts`:
  - Load the template file for the selected model
  - Fill in placeholders from `ModelConfig` and `LlmConfig`
  - Return the assembled system prompt string
- [X] Create the user prompt builder that formats the deterministic prompt + user selections.
- [X] Add unit tests for system prompt building with different model configs.
- [X] Add unit tests for user prompt building.

### Step 4: Implement LLM Response Validation
- [X] Create `src/llm/response-validation.ts`:
  - Define a zod schema for the expected LLM response shape
  - Implement `containsSubject` refinement — check that at least one keyword from the subject selection appears in the response
  - Implement `noMetadata` refinement — reject responses with markdown, instructions, or quoted blocks
  - Export a `validateLlmResponse(response, intermediate)` function
- [X] Return typed validation results (success with cleaned string, or failure with reason).
- [X] Add unit tests for:
  - valid response
  - empty response
  - response exceeding max length
  - response missing subject reference
  - response containing metadata or instructions

### Step 5: Implement `normalizeWithLlm()` Orchestrator
- [ ] Create `src/llm/normalize.ts`:
  - Accept `intermediate`, `deterministicPrompt`, `modelConfig`, and `llmConfig`
  - Build system prompt from model template
  - Build user prompt from intermediate + deterministic prompt
  - Call the LLM client
  - Validate the response
  - Return `LlmNormalizationResult`
- [ ] Implement retry logic:
  - On first failure (network error, timeout, or validation rejection), retry once
  - On second failure, return a failure result with the reason
  - The caller decides to fall back to deterministic
- [ ] Add timeout handling — abort the LLM call if it exceeds `LLM_TIMEOUT_MS`.
- [ ] Export the function from `src/llm/index.ts`.
- [ ] Add unit tests with mocked LLM client:
  - successful normalization
  - first call fails, retry succeeds
  - both calls fail, returns failure result
  - timeout scenario
  - validation rejection scenario

### Step 6: Integrate LLM Step into the Generation Pipeline
- [ ] Update `src/normalization/generate.ts`:
  - Add an optional `llmConfig` parameter to `generatePrompt()`
  - After `adaptToModel()` succeeds, if `llmConfig` is provided, call `normalizeWithLlm()`
  - On LLM success, replace `output.positivePrompt` with the rewritten version
  - On LLM failure, keep the deterministic prompt and add a warning
  - Add `normalizedBy: 'deterministic' | 'llm'` to the result
- [ ] Update `GenerationSuccess` type to include `normalizedBy` field.
- [ ] Update `NormalizedOutput` or add a metadata wrapper for the normalization mode.
- [ ] Add a new error stage `'llm-normalization'` to `GenerationError` — used only when the pipeline should surface the LLM error instead of silently falling back (e.g., if a strict mode is added later).
- [ ] Add integration tests for:
  - full pipeline with LLM enabled and successful
  - full pipeline with LLM enabled but LLM fails (falls back to deterministic)
  - full pipeline without LLM (unchanged behavior)

### Step 7: Update the CLI Layer
- [ ] Update `src/index.ts`:
  - Parse the `--llm` flag from `process.argv`
  - When `--llm` is set, load and validate LLM config before entering the interactive flow
  - Pass `llmConfig` into `generatePrompt()`
- [ ] Update `src/cli/display.ts`:
  - Show the normalization mode (`Deterministic` or `LLM`) in the output header
  - When LLM normalization was used, optionally show the original deterministic prompt in debug mode for comparison
- [ ] Update `src/cli/recovery.ts`:
  - If LLM normalization fails and falls back, show a brief info message (not an error): `LLM normalization unavailable, using deterministic prompt.`
- [ ] Add end-to-end tests for:
  - CLI run with `--llm` flag and valid API key (mocked)
  - CLI run with `--llm` flag and missing API key (startup error)
  - CLI run without `--llm` flag (unchanged behavior)

### Step 8: Create Flux LLM Prompt Template
- [ ] Write `models/flux/llm-prompt.txt` with Flux-specific rewriting instructions:
  - Reference Flux's natural-language preference
  - Instruct the LLM to write as flowing prose, not tag lists
  - Emphasize preserving all user-selected details
  - Include character limit instruction
- [ ] Test the template with real LLM calls against a few representative user selections.
- [ ] Iterate on wording based on output quality.
- [ ] Document the template format and available placeholders in the model file documentation section.

### Step 9: Add Error Handling for LLM-Specific Failures
- [ ] Handle missing API key at startup with a clear message and non-zero exit.
- [ ] Handle network errors (DNS, connection refused) with a concise message and fallback.
- [ ] Handle rate limiting (HTTP 429) with a message suggesting the user wait or switch to deterministic mode.
- [ ] Handle malformed LLM responses (not a string, contains JSON, etc.) with validation and fallback.
- [ ] Handle timeout with a configurable threshold and fallback.
- [ ] In debug mode, print the full LLM request and response for diagnostics.
- [ ] Never print API keys or auth headers in any mode.

### Step 10: Test the LLM Integration Thoroughly
- [ ] Unit test LLM config loading (all env var combinations).
- [ ] Unit test LLM client abstraction (mocked HTTP calls).
- [ ] Unit test system prompt building for all supported models.
- [ ] Unit test user prompt building with different intermediate schemas.
- [ ] Unit test response validation (all passing and failing cases).
- [ ] Unit test `normalizeWithLlm()` orchestrator (success, retry, timeout, validation failure).
- [ ] Unit test pipeline integration (with and without LLM config).
- [ ] Integration test full CLI flow with mocked LLM provider.
- [ ] Integration test fallback behavior when LLM is unavailable.
- [ ] Manual test with real OpenRouter API key to validate prompt quality.

### Step 11: Update Documentation
- [ ] Update `README.md`:
  - Add LLM normalization section explaining the feature and how to enable it
  - Document required environment variables (`OPENROUTER_API_KEY`, `LLM_MODEL`, etc.)
  - Add example output showing LLM-enhanced prompt vs deterministic prompt
  - Update the scripts table if new scripts are added
  - Update test count
- [ ] Document the per-model `llm-prompt.txt` template format in the model file structure section.
- [ ] Document how to add LLM support for a new model.
- [ ] Add a troubleshooting section for common LLM issues (missing key, timeout, rate limiting).

## Deliverables for LLM Integration Completion
- [ ] A `--llm` CLI flag that enables LLM-powered prompt normalization
- [ ] OpenRouter integration using the `openai` SDK with `gpt-5.4` as the default model
- [ ] Per-model LLM system prompt templates (starting with Flux)
- [ ] Zod-validated LLM response handling with subject-preservation checks
- [ ] Retry logic (1 retry) with automatic fallback to deterministic output
- [ ] Startup validation for `OPENROUTER_API_KEY` when LLM mode is requested
- [ ] `normalizedBy` metadata indicating which normalization path was used
- [ ] Comprehensive tests with mocked LLM calls
- [ ] Updated README with setup instructions and examples

## Risks and Decisions to Resolve Early
- [X] Decide whether `openai/gpt-5.4` provides the best cost-to-quality ratio through OpenRouter, or whether a different model should be the default.
- [X] Decide whether the interactive flow should ask about LLM mode or only support the CLI flag.
- [X] Decide whether to add a `--strict-llm` mode that fails instead of falling back to deterministic on LLM error.
- [X] Decide whether to cache LLM responses for identical intermediate schemas to reduce API costs during development.
- [X] Decide whether the LLM should also rewrite the negative prompt in a future iteration.
- [X] Decide whether to support streaming LLM responses for perceived speed improvement in the terminal.

### Resolved Decisions
- `openai/gpt-5.4` is the default model. It provides a good balance of quality and speed for short prompt rewriting tasks. Users can override via `LLM_MODEL` env var to try other OpenRouter models without code changes.
- The interactive flow does NOT ask about LLM mode. The `--llm` flag is the only activation mechanism. This keeps the questionnaire identical in both modes and avoids user confusion when no API key is configured.
- No `--strict-llm` mode in this release. Silent fallback to deterministic is the only behavior. A strict mode that surfaces LLM errors as pipeline failures can be added as a future extension if needed for automated workflows.
- No response caching in this release. Each LLM call goes through OpenRouter fresh. Caching with content-addressable storage is deferred to future extensions — it adds complexity around cache invalidation when system prompts or model configs change.
- The LLM does NOT rewrite the negative prompt. Negative prompts are curated quality/safety keywords that should remain exact. LLM-powered negative prompt rewriting is listed as a future extension.
- No streaming in this release. The LLM response is awaited in full before validation and display. Streaming adds complexity around progressive validation and terminal rendering. Deferred to future extensions.

## Future Extensions (Out of Scope for This Roadmap)
- Local Ollama provider support for offline usage (bypass OpenRouter)
- LLM-powered negative prompt rewriting
- Streaming LLM output displayed progressively in the terminal
- Response caching with content-addressable storage
- A/B comparison mode showing deterministic vs LLM prompts side by side
- Cost tracking and usage reporting for OpenRouter API calls
- Custom user-provided system prompt overrides
- Model comparison mode — run the same prompt through multiple OpenRouter models and compare results

## Suggested Implementation Order
- [X] Lock product decisions and confirm scope (Step 1)
- [X] Add LLM client dependency and provider abstraction (Step 2)
- [X] Create per-model LLM system prompt templates (Step 3)
- [X] Implement response validation (Step 4)
- [ ] Implement `normalizeWithLlm()` orchestrator (Step 5)
- [ ] Integrate into generation pipeline (Step 6)
- [ ] Update CLI layer with `--llm` flag and display changes (Step 7)
- [ ] Write and test the Flux LLM prompt template (Step 8)
- [ ] Add LLM-specific error handling (Step 9)
- [ ] Comprehensive testing (Step 10)
- [ ] Update documentation (Step 11)
