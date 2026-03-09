export interface PromptIntentInput {
  style: string;
  subject: string;
  scene: string;
  mood: string;
  composition: string;
  lighting: string;
  cameraLens: string;
}

function humanize(value: string): string {
  return value.replace(/-/g, ' ');
}

export function buildPromptIntent(input: PromptIntentInput): string {
  const parts = [
    humanize(input.composition),
    'of a',
    humanize(input.mood),
    humanize(input.subject),
    'in a',
    humanize(input.scene),
    'with',
    humanize(input.lighting),
    `shot on ${humanize(input.cameraLens)}`,
    `in ${humanize(input.style)} style`,
  ];
  return parts.join(' ');
}
