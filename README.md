# comfy-prompt-generator

Interactive CLI for generating structured image prompts for ComfyUI.

The tool guides you through a series of selections — style, subject, scene, mood, composition, lighting, camera lens, and negative prompt — then produces a model-ready positive prompt, negative prompt, and resolution for use in ComfyUI workflows.

## Requirements

- Node.js 22 or later

## Installation

```bash
git clone <repo-url>
cd comfy-prompt-generator
npm install
```

## Usage

### Interactive mode (development)

```bash
npm run dev
```

### Built version

```bash
npm run build
npm start
```

### LLM-enhanced mode

Pass `--llm` to enable LLM-powered prompt normalization. The LLM rewrites the deterministic positive prompt into more natural, expressive language optimized for the target image model. The negative prompt, dimensions, and all other outputs are unchanged.

```bash
npm run dev -- --llm
```

LLM mode requires an OpenRouter API key. Set it as an environment variable before running:

```bash
export OPENROUTER_API_KEY=sk-or-v1-your-key-here
npm run dev -- --llm
```

On Windows (PowerShell):

```powershell
$env:OPENROUTER_API_KEY="sk-or-v1-your-key-here"
npm run dev -- --llm
```

Or create a `.env` file in the project root (already in `.gitignore`):

```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

The deterministic prompt is always generated first and used as the LLM's input. If the LLM call fails (network error, timeout, rate limit, or invalid response), the CLI silently falls back to the deterministic prompt and shows a brief info message.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | When `--llm` is used | — | API key from [OpenRouter](https://openrouter.ai/keys) |
| `LLM_MODEL` | No | `openai/gpt-5.4` | Any model available on [OpenRouter](https://openrouter.ai/models) |
| `LLM_TIMEOUT_MS` | No | `15000` | Max milliseconds to wait for an LLM response |
| `LLM_MAX_PROMPT_LENGTH` | No | `500` | Max characters for the rewritten prompt |
| `DEBUG` | No | `0` | Set to `1` to enable debug output |

### Debug mode

Pass `--debug` or set `DEBUG=1` to print the full intermediate schema and normalized output JSON after generation. When combined with `--llm`, debug mode also prints the LLM request (system prompt, user prompt, model, timeout) and the raw LLM response for diagnostics. API keys are never printed.

```bash
npm run dev -- --debug
npm run dev -- --llm --debug
```

## Interactive Flow

The CLI asks one question at a time in this order:

1. **Type** — `image` (video support planned)
2. **Model** — `Flux` (more models planned)
3. **Style** — cinematic realism, fashion editorial, natural lifestyle photography, dark moody portrait, luxury commercial photo
4. **Subject** — young woman, young man
5. **Scene** — modern city street, cozy cafe interior, luxury studio backdrop, rooftop at sunset, minimalist apartment interior
6. **Mood** — confident, mysterious, relaxed, romantic, dramatic
7. **Aspect ratio** — 1:1, 4:5, 3:4, 16:9, 9:16
8. **Composition** — close-up portrait, head-and-shoulders portrait, medium shot, full-body shot, candid over-the-shoulder
9. **Lighting** — soft natural daylight, golden hour sunlight, dramatic studio lighting, neon night lighting, soft window light
10. **Camera / lens** — 35mm documentary, 50mm natural, 85mm portrait, 24mm environmental, 70-200mm compressed fashion
11. **Negative prompt** — multi-select from 10 options tuned for realistic human images (optional, press Enter to skip)

After answering, a confirmation screen shows all selections. You can:
- **Generate** — run the prompt pipeline
- **Restart** — start over from the first question
- **Cancel** — exit without generating

After generation, you can generate another prompt or exit.

## Example Output

Given these selections:

| Field | Value |
|---|---|
| Style | Cinematic Realism |
| Subject | Young Woman |
| Scene | Modern City Street |
| Mood | Confident |
| Aspect Ratio | 16:9 |
| Composition | Medium Shot |
| Lighting | Golden Hour Sunlight |
| Camera / Lens | 85mm Portrait Lens |
| Negative | Blurry, Bad Anatomy, Deformed Hands |

### Deterministic output (default)

```
── Positive Prompt (Deterministic) ──────────────
  Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism
─────────────────────────────────────────

── Negative Prompt ──────────────────────
  blurry, bad anatomy, deformed hands
─────────────────────────────────────────

── Dimensions ──────────────────────────
  1344 × 768
─────────────────────────────────────────
```

### LLM-enhanced output (`--llm`)

```
── Positive Prompt (LLM) ──────────────
  A confident young woman stands on a modern city street bathed in warm golden hour sunlight, her presence captured in a cinematic medium shot through an 85mm portrait lens that renders the bustling urban backdrop into a soft, luminous blur of light and shadow.
─────────────────────────────────────────

── Negative Prompt ──────────────────────
  blurry, bad anatomy, deformed hands
─────────────────────────────────────────

── Dimensions ──────────────────────────
  1344 × 768
─────────────────────────────────────────
```

The LLM rewrites the positive prompt into flowing natural language while preserving every detail from the original selections. The negative prompt and dimensions are identical in both modes.

## Project Structure

```
src/
  index.ts              CLI entry point (parses --llm, --debug flags)
  cli/                  Interactive prompts, confirmation, display, recovery
  config/               Static preset option lists
  domain/               Shared schema, types, prompt intent builder, answer mapper
  llm/                  LLM integration (client, config, normalization, validation)
  models/               Model registry, config loader, config schema
  normalization/        Adapter, generation pipeline, output types
models/
  flux/
    config.json         Flux model definition
    llm-prompt.txt      Flux LLM system prompt template
    example-output.json Documented expected output shape
tests/
  unit/                 Schema, presets, mapping, adapter, display, LLM config/client/validation tests
  integration/          Full pipeline, error scenarios, LLM pipeline and CLI flow tests
```

## Model File Structure

Each model has a directory under `models/` with a `config.json` file. The config must match this schema:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique model identifier (e.g. `flux`) |
| `label` | string | Human-friendly name (e.g. `Flux`) |
| `promptStrategy` | enum | `natural-language`, `tag-based`, or `structured` |
| `promptGuidance` | string | Instructions for how this model expects prompts |
| `positivePromptTemplate` | string | Template with `{placeholder}` variables |
| `negativePromptSeparator` | string | Separator between negative prompt items |
| `defaultNegativePrefix` | string | Optional prefix prepended to negative prompt |
| `aspectRatioMap` | object | Maps ratio strings to `{ width, height }` in pixels |

### Template Placeholders

The positive prompt template supports these placeholders:

- `{style}` — humanized style value
- `{subject}` — humanized subject value
- `{scene}` — humanized scene value
- `{mood}` — humanized mood value
- `{composition}` — humanized and capitalized composition value
- `{lighting}` — humanized lighting value
- `{cameraLens}` — humanized camera lens value

### Example: Flux config

```json
{
  "id": "flux",
  "label": "Flux",
  "promptStrategy": "natural-language",
  "promptGuidance": "Use natural-language descriptions...",
  "positivePromptTemplate": "{composition} of a {mood} {subject}, {scene}, {lighting}, shot on {cameraLens}, {style}",
  "negativePromptSeparator": ", ",
  "defaultNegativePrefix": "",
  "aspectRatioMap": {
    "1:1": { "width": 1024, "height": 1024 },
    "16:9": { "width": 1344, "height": 768 }
  }
}
```

### LLM System Prompt Template

Each model can optionally include an `llm-prompt.txt` file that controls how the LLM rewrites deterministic prompts when `--llm` mode is enabled. The file uses placeholder syntax that is filled at runtime.

#### Available Placeholders

| Placeholder | Source | Description |
|---|---|---|
| `{model.label}` | `config.json` → `label` | Human-friendly model name (e.g. `Flux`) |
| `{model.promptGuidance}` | `config.json` → `promptGuidance` | Model-specific prompt writing guidance |
| `{maxLength}` | `LLM_MAX_PROMPT_LENGTH` env var | Maximum output character count (default: 500) |

All occurrences of each placeholder are replaced. The template is sent as the system prompt; the user prompt contains the deterministic output and user selections.

#### Example: Flux LLM template

```
You are a prompt engineer specializing in {model.label} image generation.

Model guidance:
{model.promptGuidance}

Your task:
Rewrite the following deterministic prompt into a higher-quality, expressive
natural-language prompt optimized for {model.label}.

Rules:
- Preserve ALL details from the original.
- Write as a single flowing paragraph of descriptive prose.
- Keep the output under {maxLength} characters.
- Return ONLY the rewritten prompt text, no explanations or metadata.
```

## Adding a New Model

1. Create a directory: `models/<model-id>/`
2. Create `config.json` matching the schema above
3. Optionally create `llm-prompt.txt` with model-specific LLM rewriting instructions using the placeholders above
4. Add the model id to the `SUPPORTED_MODELS` array in `src/models/registry.ts`
5. Add the model id to the `modelSchema` enum in `src/domain/schema.ts`
6. Add a new option to `src/config/model-options.ts`
7. Run `npm test` to verify the new model config loads and validates

The prompt template and separator in `config.json` control how the model's prompt is assembled. The `llm-prompt.txt` template controls LLM rewriting behavior when `--llm` mode is used. No code changes to the pipeline are needed — only config and registry updates.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run the CLI in development mode with tsx |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled CLI |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |

## Tests

303 tests across 19 test files covering:
- Preset option lists (counts, duplicates, naming conventions, locked values)
- Schema validation (valid input, every invalid field, edge cases)
- Answer-to-schema mapping (trimming, validation errors)
- Flux adapter (template filling, negative prompt joining, dimensions, custom configs)
- Model config loading (success, missing files, invalid content)
- Generation pipeline (end-to-end success, stage-specific failures)
- Display output (console capture for results, errors, debug, normalization mode)
- LLM config loading (all env var combinations, defaults, validation)
- LLM client abstraction (mocked HTTP calls, error classification)
- LLM system/user prompt building (template loading, placeholder filling)
- LLM response validation (empty, too long, missing subject, metadata detection)
- LLM orchestrator (success, retry, timeout, validation failure)
- LLM pipeline integration (with and without LLM, fallback behavior)
- LLM CLI flow (full end-to-end with mocked provider, startup errors)
- LLM error handling (debug logging, API key safety)
- Integration tests (every style×subject combo, every option, error scenarios)

## Troubleshooting

### LLM mode: missing API key

```
LLM mode requires OPENROUTER_API_KEY. Get one at https://openrouter.ai/keys or use deterministic mode.
```

Set the `OPENROUTER_API_KEY` environment variable or add it to a `.env` file. If you don't need LLM mode, omit the `--llm` flag.

### LLM mode: request timed out

```
LLM normalization unavailable, using deterministic prompt.
```

The LLM call exceeded the timeout (default 15 seconds). The CLI falls back to the deterministic prompt automatically. To increase the timeout:

```bash
export LLM_TIMEOUT_MS=30000
```

### LLM mode: rate limited (429)

OpenRouter rate-limits requests based on your plan. Wait a moment and try again, or run without `--llm` to use deterministic mode.

### LLM mode: authentication failed

Check that your `OPENROUTER_API_KEY` is valid and has not expired. Get a new key at [openrouter.ai/keys](https://openrouter.ai/keys).

### LLM mode: response validation failed

The LLM returned a response that didn't pass validation (missing subject reference, contained markdown/metadata, or exceeded the max length). The CLI retries once, then falls back to deterministic. Use `--debug` to see the raw LLM response and the specific validation failure.

## License

MIT
