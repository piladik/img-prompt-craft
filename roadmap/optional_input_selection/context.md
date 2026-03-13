# Context: Optional Input Selection

Files to change or reference when implementing the optional input selection flow. See `roadmap-optional-input-selection.md` in this directory for the full feature spec.

---

## Must change

| File | Rationale |
|------|-----------|
| `src/cli/collect-answers.ts` | Refactor to ask required (type, model, subject) first, then run optional-input multi-select, then ask only the selected optional questions in fixed order. |
| `src/cli/prompts.ts` | Add a checkbox-style multi-select prompt that returns the list of selected optional field ids (style, scene, mood, composition, lighting, cameraLens, negativePrompt). |
| `src/cli/types.ts` | Make optional fields optional on `RawAnswers`; remove `aspectRatio`; add a type for the optional-input selection result (e.g. `selectedOptionalInputs`). |
| `src/cli/optional-fields.ts` | Canonical optional field ids, definitions, type guard, and stable-order validation function. Added in Step 2. |
| `src/cli/confirmation.ts` | Update `formatSummary` and confirmation UX to show required answers and only the chosen optional categories/values; remove `aspectRatio` from the summary and lookup contract. |
| `src/domain/schema.ts` | Make optional prompt-refinement fields optional on `intermediatePromptSchema`; remove `aspectRatio` completely from the domain schema. |
| `src/domain/map-answers.ts` | Map from partial `RawAnswers` (only required + selected optional) to intermediate schema; handle omitted optional fields explicitly and remove all `aspectRatio` handling. |
| `src/domain/prompt-intent.ts` | Support partial input for optional fields without relying on deleted fields. |
| `src/domain/index.ts` | Remove `aspectRatio` schema/type exports and keep the domain barrel aligned with the new contract. |
| `src/normalization/adapt.ts` | Handle missing optional fields on `IntermediatePrompt` (template vars, negativePrompt) and remove all `aspectRatio` / dimension logic. |
| `src/normalization/types.ts` | Remove `width` and `height` from normalized output types. |
| `src/normalization/generate.ts` | Ensure pipeline still works when intermediate has optional fields omitted and normalized output no longer includes dimensions. |
| `src/models/model-config-schema.ts` | Remove `aspectRatioMap` from the model config schema. |
| `models/*/config.json` | Remove image-size data from model config JSON files. |
| `src/storage/types.ts` | Remove `aspectRatio`, `width`, and `height` from `PromptRunInsert` and `PromptRunRow`; keep optional prompt refinements aligned with the new contract. |
| `src/storage/mappers.ts` | Map omitted optional fields from answers to the insert payload without any deleted-field references. |
| `src/storage/schema.ts` | Decode DB rows using the new row shape without `aspect_ratio`, `width`, or `height`. |
| `src/storage/migrations/001_create_prompt_runs.sql` | Updated to remove `aspect_ratio`, `width`, and `height` from the CREATE TABLE definition for fresh installs. |
| `src/storage/migrations/002_drop_image_size_fields.sql` | New migration to drop `aspect_ratio`, `width`, and `height` from existing `prompt_runs` tables. Added in Step 6. |
| `src/storage/repositories/prompt-runs.ts` | INSERT must accept null for optional columns; parameter list and types already driven by `PromptRunInsert`. |
| `src/cli/history/display.ts` | Remove deleted fields from detail output and display absent optional selections cleanly. |
| `src/config/aspect-ratio-options.ts` | Delete the obsolete aspect-ratio preset module. |
| `src/config/index.ts` | Remove aspect-ratio exports and keep shared option exports aligned with the new flow. |
| `src/index.ts` | Remove aspect-ratio lookup wiring and any assumptions that normalized results contain dimensions. |
| `tests/unit/optional-fields.test.ts` | Unit tests for optional field definitions, type guard, validation, and stable ordering. Added in Step 2. |
| `tests/unit/collect-answers.test.ts` | Unit tests for optionalPromptMap coverage and stable question order. Added in Step 3. |
| `tests/unit/map-answers.test.ts` | Cover mapping with only required fields and with mixed required + subset of optional; update `validRawAnswers` and invalid-case tests for new contract. |
| `tests/unit/format-summary.test.ts` | Cover summary with only required fields and with selected optional fields; ensure omitted optionals are not shown and deleted fields never appear. |
| `tests/unit/storage-mappers.test.ts` | Cover `mapToPromptRunInsert` with omitted optional fields and no deleted-field payload. |
| `tests/unit/generate.test.ts` | Update `validRawAnswers()` and add cases for minimal (required-only) and partial-optional flows without dimensions. |
| `tests/unit/schema.test.ts` | Add tests for valid partial objects and remove `aspectRatio`-specific assertions. |
| `tests/unit/history-display.test.ts` | Cover detail view without deleted fields and with absent optional selections. |
| `tests/unit/adapt.test.ts` | Remove aspect-ratio and dimension expectations; verify prompt-only output behavior. |
| `tests/unit/model-config.test.ts` | Update model-config expectations to the no-image-size contract. |
| `tests/unit/storage-schema.test.ts` | Update row-decoding expectations for the new storage shape. |
| `tests/integration/full-pipeline.test.ts` | Add or adjust scenarios for zero optional inputs and for a subset (e.g. mood + scene only); update `makeAnswers` for optional shape. |
| `tests/integration/llm-cli-flow.test.ts` | Use new answer shape (optional fields omitted when not selected). |
| `tests/integration/llm-pipeline.test.ts` | Use new answer shape where applicable. |
| `tests/integration/error-scenarios.test.ts` | Ensure error paths still work with partial answers if touched. |
| `README.md` | Document required vs optional inputs, the optional selection step, and an example minimal-flow run. |

---

## Likely change

| File | Rationale |
|------|-----------|
| `src/config/index.ts` | May export a stable list of optional field ids and labels for the multi-select (or this can live in CLI). |
| `tests/unit/config-presets.test.ts` | Remove assertions that expect aspect-ratio presets to exist. |
| `tests/unit/display.test.ts` | Update any output snapshots or expectations impacted by the new confirmation/history behavior. |
| `tests/unit/response-validation.test.ts` | Remove raw-answer fixtures that still include `aspectRatio`. |
| `tests/unit/build-system-prompt.test.ts` | Update fixtures/types if they still assume `aspectRatio` or explicit dimensions. |
| `tests/unit/normalize.test.ts` | Update normalization expectations for prompt-only outputs. |
| `tests/unit/llm-error-handling.test.ts` | Update any config/result fixtures that still include image-size data. |

---

## Reference only

| File | Rationale |
|------|-----------|
| `src/cli/index.ts` | Re-exports CLI types and functions; update only if new exports (e.g. optional field list) are needed. |
| `src/cli/display.ts` | General CLI display; no direct use of RawAnswers or optional flow. |
| `src/cli/recovery.ts` | Recovery prompts; no structural dependency on answer shape. |
| `src/cli/history/flow.ts` | History flow; consumes storage types, not RawAnswers. |
| `src/models/load-model-config.ts` | Model config loading; reference for pipeline. |
| `src/llm/*` | LLM normalization path; reference for pipeline. |
| `src/config/*` (e.g. `style-options.ts`, `scene-options.ts`, …) | Option lists for prompts and multi-select choices; reference for labels/values. |

---

## Cross-cutting notes

- **Schema first:** Lock required-vs-optional and how omitted fields are represented (optional props, not hidden defaults) before changing collection, mapping, normalization, and storage.
- **Hard deletion:** This feature removes `aspectRatio`, `aspect_ratio`, `width`, `height`, and model-config image-size data completely. Do not reintroduce them as internal defaults or renamed fields.
- **Validation:** Domain and storage Zod schemas must accept partial optional data where decided; no RawAnswers-specific Zod in CLI today—validation is in `mapAnswersToSchema` and storage decode.
- **Cleanup pass:** Remove dead exports, preset modules, fixtures, and tests that still reference deleted fields.
