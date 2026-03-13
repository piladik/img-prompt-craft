import type { OptionalFieldId } from './optional-fields.js';

export interface RawAnswers {
  type: string;
  model: string;
  subject: string;
  selectedOptionalInputs?: OptionalFieldId[];
  style?: string;
  scene?: string;
  mood?: string;
  composition?: string;
  lighting?: string;
  cameraLens?: string;
  negativePrompt?: string[];
}

export type ConfirmationAction = 'generate' | 'restart' | 'cancel';

export type PostGenerationAction = 'generate-again' | 'exit';
