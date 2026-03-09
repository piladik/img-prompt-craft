import {
  typeOptions,
  modelOptions,
  styleOptions,
  subjectOptions,
  sceneOptions,
  moodOptions,
  aspectRatioOptions,
  compositionOptions,
  lightingOptions,
  cameraLensOptions,
  negativePromptOptions,
} from '../config/index.js';
import {
  askType,
  askModel,
  askStyle,
  askSubject,
  askScene,
  askMood,
  askAspectRatio,
  askComposition,
  askLighting,
  askCameraLens,
  askNegativePrompt,
} from './prompts.js';
import type { RawAnswers } from './types.js';

export async function collectAnswers(): Promise<RawAnswers> {
  const type = await askType(typeOptions);
  const model = await askModel(modelOptions);
  const style = await askStyle(styleOptions);
  const subject = await askSubject(subjectOptions);
  const scene = await askScene(sceneOptions);
  const mood = await askMood(moodOptions);
  const aspectRatio = await askAspectRatio(aspectRatioOptions);
  const composition = await askComposition(compositionOptions);
  const lighting = await askLighting(lightingOptions);
  const cameraLens = await askCameraLens(cameraLensOptions);
  const negativePrompt = await askNegativePrompt(negativePromptOptions);

  return {
    type,
    model,
    style,
    subject,
    scene,
    mood,
    aspectRatio,
    composition,
    lighting,
    cameraLens,
    negativePrompt,
  };
}
