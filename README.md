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

### Debug mode

Pass `--debug` or set `DEBUG=1` to print the full intermediate schema and normalized output JSON after generation.

```bash
npm run dev -- --debug
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

The CLI produces:

```
── Positive Prompt ──────────────────────
  Medium shot of a confident young woman, modern city street, golden hour sunlight, shot on 85mm portrait lens, cinematic realism
─────────────────────────────────────────

── Negative Prompt ──────────────────────
  blurry, bad anatomy, deformed hands
─────────────────────────────────────────

── Dimensions ──────────────────────────
  1344 × 768
─────────────────────────────────────────
```

## Project Structure

```
src/
  index.ts              CLI entry point
  cli/                  Interactive prompts, confirmation, display, recovery
  config/               Static preset option lists
  domain/               Shared schema, types, prompt intent builder, answer mapper
  models/               Model registry, config loader, config schema
  normalization/        Adapter, generation pipeline, output types
models/
  flux/
    config.json         Flux model definition
    example-output.json Documented expected output shape
tests/
  unit/                 Schema, presets, mapping, adapter, display, config tests
  integration/          Full pipeline and error scenario tests
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

## Adding a New Model

1. Create a directory: `models/<model-id>/`
2. Create `config.json` matching the schema above
3. Add the model id to the `SUPPORTED_MODELS` array in `src/models/registry.ts`
4. Add the model id to the `modelSchema` enum in `src/domain/schema.ts`
5. Add a new option to `src/config/model-options.ts`
6. Run `npm test` to verify the new model config loads and validates

The prompt template and separator in `config.json` control how the model's prompt is assembled. No code changes to the pipeline are needed — only config and registry updates.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run the CLI in development mode with tsx |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled CLI |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |

## Tests

195 tests across 11 test files covering:
- Preset option lists (counts, duplicates, naming conventions, locked values)
- Schema validation (valid input, every invalid field, edge cases)
- Answer-to-schema mapping (trimming, validation errors)
- Flux adapter (template filling, negative prompt joining, dimensions, custom configs)
- Model config loading (success, missing files, invalid content)
- Generation pipeline (end-to-end success, stage-specific failures)
- Display output (console capture for results, errors, debug)
- Integration tests (every style×subject combo, every option, error scenarios)

## License

MIT
