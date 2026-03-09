# History Full Prompt Visibility

## Objective
- Ensure that when a user opens a saved prompt from `--history`, the full prompt content is clearly visible without relying on truncated previews.
- Keep the history flow interactive-first and focused on browsing, reading, and exiting cleanly.
- Preserve the current storage model and avoid changing how prompt runs are saved unless the display contract requires it.

## Current Relevant State
- The history list is interactive and shows one-line entries with a truncated `positivePromptPreview`.
- Selecting a history item opens a detail screen that prints saved fields, including the stored positive and negative prompts.
- The current experience depends on plain terminal printing, which makes long prompts harder to scan and does not offer a dedicated prompt-focused reading mode.
- Storage already persists the full `positivePrompt` and `negativePrompt`, so this feature is primarily a CLI history UX improvement.

## Problem to Solve
- The list view intentionally truncates prompt previews, so users cannot inspect prompt text before opening a record.
- Even after opening a record, long prompts are shown as one printed block with no explicit prompt-reading workflow.
- Users reviewing history need confidence that the full generated prompt is visible, readable, and not silently shortened.

## Feature Scope
- In scope:
  - guarantee that the full positive prompt is visible when a history record is opened
  - keep the full negative prompt visible in the same detail experience
  - improve prompt readability for long multi-clause prompts
  - add tests that lock the no-truncation behavior for the selected history record
- Out of scope:
  - editing stored prompts
  - copying to clipboard
  - exporting history records to files
  - full-text search across prompt history

## Product Decisions to Lock
- Opening a history item should always show the full stored positive prompt, never a preview.
- The selected-record view should remain terminal-native and should not require external pagers.
- The list screen may continue to use truncated previews for scanning, but the selected-record screen must not.
- The detail screen should keep the full negative prompt visible as well, since users often review both together.
- If prompts are extremely long, the CLI should favor readable wrapped sections over condensed one-line output.

## Recommended UX

### History List
- Keep the current recent-history list optimized for quick scanning.
- Continue showing a short prompt preview in the selectable list so the menu stays readable.
- Make the transition from list view to full detail explicit: selecting a record means opening the full prompt view.

### Selected Prompt View
- Show a dedicated detail screen with clearly separated sections:
  - record metadata
  - saved selections
  - full positive prompt
  - full negative prompt
  - dimensions and LLM warning when present
- Render positive and negative prompts as multi-line blocks rather than inline summary rows.
- Avoid any manual truncation or preview slicing in the selected-record display path.

### Suggested Detail Presentation
- Keep the existing sectioned layout, but upgrade prompt sections so they read like content blocks instead of single console lines.
- If needed, add a short label above each prompt block such as `Full Positive Prompt` and `Full Negative Prompt`.
- Preserve the existing `back-to-history` and `exit` actions after the prompt is shown.

## Implementation Plan

### Step 1: Lock the Selected-Record Display Contract
- [ ] Confirm that "full prompt visible" means both positive and negative prompts in the detail view.
- [ ] Confirm that list previews remain truncated and only the selected-record view is upgraded.
- [ ] Confirm whether prompt text should be wrapped with indentation or printed as raw blocks.

### Step 2: Refine the History Detail Renderer
- [ ] Update the history detail formatter in `src/cli/history/display.ts`.
- [ ] Print prompt sections as multi-line blocks that are easier to read for long text.
- [ ] Remove any risk of future prompt truncation in the selected-record rendering path.
- [ ] Keep the overall detail layout concise and stable for tests.

### Step 3: Review the History Flow Contract
- [ ] Verify that `src/cli/history/flow.ts` always routes the selected record into the upgraded detail display.
- [ ] Ensure the user can return to the list without losing the history context.
- [ ] Keep empty-state, corrupted-row, and not-found handling unchanged unless the new UI needs minor copy updates.

### Step 4: Add Tests
- [ ] Add or update unit tests for the history detail formatter.
- [ ] Add a test case with a long positive prompt and verify the full string is present in rendered output.
- [ ] Add a test case with a long negative prompt and verify it is also fully shown.
- [ ] Keep list-view tests separate so truncated previews remain an intentional behavior there.

### Step 5: Document the Behavior
- [ ] Update `README.md` history documentation to state that selecting a saved record shows the full prompt text.
- [ ] Clarify that only the list uses previews; the selected record shows full prompt details.

## Suggested Deliverables
- [ ] Selected history records always display the full positive prompt
- [ ] Selected history records always display the full negative prompt
- [ ] Prompt sections are easier to read for long saved outputs
- [ ] Tests cover long-prompt detail rendering
- [ ] README reflects the upgraded history behavior

## Risks and Edge Cases
- [ ] Very long prompts may create visually noisy terminal output if section formatting is not improved.
- [ ] Future changes could accidentally reintroduce truncation if prompt preview helpers are reused in detail rendering.
- [ ] Snapshot-style tests may become brittle if the display format changes too often.

## Recommended Implementation Order
- [ ] Lock the detail-view contract
- [ ] Update the history detail renderer
- [ ] Verify history navigation still feels clean
- [ ] Add long-prompt rendering tests
- [ ] Update README history docs
