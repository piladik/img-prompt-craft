# Future Features

## LLM Prompt Normalization

### Goal
- Add an optional LLM-powered normalization step that rewrites the deterministic prompt into higher-quality, model-optimized natural language.
- The deterministic pipeline stays as the default and fallback; LLM normalization is an opt-in enhancement.

### Why
- Deterministic template filling produces predictable but sometimes stiff prompts.
- An LLM can rephrase the prompt into more natural, expressive language that image models respond to better.
- Different models benefit from different phrasing styles — an LLM can adapt tone, word choice, and structure per model.

### Planned Approach
- [ ] Add a `--llm` flag or interactive toggle that enables LLM normalization after deterministic generation.
- [ ] Define a system prompt template per model that includes:
  - the model's `promptGuidance` from its config file
  - the deterministic positive prompt as a starting point
  - instructions to preserve all user-selected details (subject, scene, mood, etc.)
  - instructions to avoid hallucinating new content not present in the user's selections
- [ ] Send the intermediate schema + deterministic prompt to the LLM.
- [ ] Validate the LLM response:
  - must be a non-empty string
  - must not exceed a configurable max length
  - should still reference the core subject, scene, and style from the original selections
- [ ] Fall back to the deterministic prompt if the LLM call fails or validation rejects the response.
- [ ] Support configurable LLM provider and model (e.g. OpenAI, Anthropic, local Ollama).
- [ ] Store API keys via environment variables, never in config files.

### Pipeline Integration
- The LLM step slots in after `adaptToModel()` and before final output display.
- The `GenerationResult` shape does not change — `output.positivePrompt` is replaced by the LLM version when available.
- A `normalizedBy` field can be added to metadata to indicate `deterministic` or `llm`.

### Tasks
- [ ] Choose an LLM client library or use raw `fetch` calls.
- [ ] Create per-model LLM system prompt templates in `models/<id>/llm-prompt.txt`.
- [ ] Implement `normalizeWithLlm(intermediate, deterministicPrompt, modelConfig)`.
- [ ] Add response validation with zod.
- [ ] Add retry logic (1 retry on failure, then fall back to deterministic).
- [ ] Add tests with mocked LLM responses for success, failure, and validation rejection.
- [ ] Add a `--llm` CLI flag and update the interactive flow to show which mode was used.
- [ ] Document setup (API key, provider selection) in README.
