import { z } from 'zod';

export const promptTypeSchema = z.enum(['image']);
export const modelSchema = z.enum(['flux']);
export const styleSchema = z.enum([
  'cinematic-realism',
  'fashion-editorial',
  'natural-lifestyle-photography',
  'dark-moody-portrait',
  'luxury-commercial-photo',
]);
export const subjectSchema = z.enum(['young-woman', 'young-man']);
export const sceneSchema = z.enum([
  'modern-city-street',
  'cozy-cafe-interior',
  'luxury-studio-backdrop',
  'rooftop-at-sunset',
  'minimalist-apartment-interior',
]);
export const moodSchema = z.enum(['confident', 'mysterious', 'relaxed', 'romantic', 'dramatic']);
export const aspectRatioSchema = z.enum(['1:1', '4:5', '3:4', '16:9', '9:16']);
export const compositionSchema = z.enum([
  'close-up-portrait',
  'head-and-shoulders-portrait',
  'medium-shot',
  'full-body-shot',
  'candid-over-the-shoulder',
]);
export const lightingSchema = z.enum([
  'soft-natural-daylight',
  'golden-hour-sunlight',
  'dramatic-studio-lighting',
  'neon-night-lighting',
  'soft-window-light',
]);
export const cameraLensSchema = z.enum([
  '35mm-documentary-look',
  '50mm-natural-perspective',
  '85mm-portrait-lens',
  '24mm-environmental-portrait',
  '70-200mm-compressed-fashion-look',
]);
export const negativePromptItemSchema = z.enum([
  'blurry',
  'low-detail-skin',
  'bad-anatomy',
  'deformed-hands',
  'extra-fingers',
  'asymmetrical-eyes',
  'unnatural-face',
  'waxy-skin',
  'text-watermark',
  'jpeg-artifacts',
]);

export const metadataSchema = z.object({
  createdAt: z.string().datetime(),
  appVersion: z.string(),
});

export const intermediatePromptSchema = z.object({
  type: promptTypeSchema,
  model: modelSchema,
  style: styleSchema,
  subject: subjectSchema,
  scene: sceneSchema,
  mood: moodSchema,
  aspectRatio: aspectRatioSchema,
  composition: compositionSchema,
  lighting: lightingSchema,
  cameraLens: cameraLensSchema,
  negativePrompt: z.array(negativePromptItemSchema),
  promptIntent: z.string().min(1),
  metadata: metadataSchema,
});

export type PromptType = z.infer<typeof promptTypeSchema>;
export type Model = z.infer<typeof modelSchema>;
export type Style = z.infer<typeof styleSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Mood = z.infer<typeof moodSchema>;
export type AspectRatio = z.infer<typeof aspectRatioSchema>;
export type Composition = z.infer<typeof compositionSchema>;
export type Lighting = z.infer<typeof lightingSchema>;
export type CameraLens = z.infer<typeof cameraLensSchema>;
export type NegativePromptItem = z.infer<typeof negativePromptItemSchema>;
export type Metadata = z.infer<typeof metadataSchema>;
export type IntermediatePrompt = z.infer<typeof intermediatePromptSchema>;
