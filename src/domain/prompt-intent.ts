export interface PromptIntentInput {
  subject: string;
  style?: string;
  scene?: string;
  mood?: string;
  composition?: string;
  lighting?: string;
  cameraLens?: string;
}

function humanize(value: string): string {
  return value.replace(/-/g, ' ');
}

export function buildPromptIntent(input: PromptIntentInput): string {
  const parts: string[] = [];

  if (input.composition) {
    parts.push(humanize(input.composition), 'of a');
  }

  if (input.mood) {
    parts.push(humanize(input.mood));
  }

  parts.push(humanize(input.subject));

  if (input.scene) {
    parts.push('in a', humanize(input.scene));
  }

  if (input.lighting) {
    parts.push('with', humanize(input.lighting));
  }

  if (input.cameraLens) {
    parts.push(`shot on ${humanize(input.cameraLens)}`);
  }

  if (input.style) {
    parts.push(`in ${humanize(input.style)} style`);
  }

  return parts.join(' ');
}
