# Context: History Full Prompt Visibility

Files and directories involved in implementing the feature, with brief rationale.

---

## Must change

| File | Rationale |
|------|-----------|
| `src/cli/history/display.ts` | Refine the history detail formatter: render positive and negative prompts as multi-line blocks (not single console lines), add explicit labels (e.g. "Full Positive Prompt" / "Full Negative Prompt"), and ensure no truncation or preview logic is used in the selected-record path. |
| `tests/unit/history-display.test.ts` | Add/update tests for the detail formatter: assert that a long positive prompt and a long negative prompt are fully present in the rendered output (no truncation in detail view). Keep list-view tests as-is so truncated previews remain the intended behavior there. |
| `README.md` | Update the "Prompt history (`--history`)" section to state that selecting a saved record shows the full prompt text, and that only the list uses previews; the selected-record view shows full prompt details. |

---

## Likely change (verify only)

| File | Rationale |
|------|-----------|
| `src/cli/history/flow.ts` | Verify that the selected record is always passed to the upgraded detail display and that back-to-list/exit behavior is unchanged. Flow already calls `printHistoryDetail(detailResult.data)` with full `PromptRunRow`; no code change expected unless the new UI requires minor copy or wiring. |

---

## Reference only (no edits required)

| File | Rationale |
|------|-----------|
| `src/storage/types.ts` | Defines `PromptRunRow` (full `positivePrompt`, `negativePrompt`) and `PromptRunSummary` (`positivePromptPreview`). Detail view consumes `PromptRunRow`; list view uses `PromptRunSummary`. |
| `src/storage/schema.ts` | Builds `PromptRunSummary` with `truncatePreview(row.positivePrompt, PREVIEW_MAX_LENGTH)` for list only. Detail path uses `getPromptRunById` and gets full row — do not reuse `truncatePreview` or summary in the detail renderer. |
| `src/cli/history/index.ts` | Re-exports display and flow; no logic change needed. |
| `src/index.ts` | Entry point that invokes `runHistoryFlow` when `--history` is used; no change for this feature. |

---

## Cross-cutting concerns

- **No shared display util for history** — formatting lives in `src/cli/history/display.ts` only.
- **No new config** — behavior is terminal-native; no env or config for prompt wrapping/labels.
- **Validation** — `PromptRunRow` is already validated by storage (schema/decode); display only consumes it.
- **Risk** — Avoid reusing list preview helpers (e.g. `positivePromptPreview` or any truncation) in the detail rendering path; the roadmap calls out this regression risk explicitly.
