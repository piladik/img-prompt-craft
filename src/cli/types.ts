export interface RawAnswers {
  type: string;
  model: string;
  style: string;
  subject: string;
  scene: string;
  mood: string;
  aspectRatio: string;
  composition: string;
  lighting: string;
  cameraLens: string;
  negativePrompt: string[];
}

export type ConfirmationAction = 'generate' | 'restart' | 'cancel';

export type PostGenerationAction = 'generate-again' | 'exit';
