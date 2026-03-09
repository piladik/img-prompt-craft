import { z } from 'zod';

export const promptStrategySchema = z.enum(['natural-language', 'tag-based', 'structured']);

export const modelConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  promptStrategy: promptStrategySchema,
  promptGuidance: z.string().min(1),
  positivePromptTemplate: z.string().min(1),
  negativePromptSeparator: z.string(),
  defaultNegativePrefix: z.string(),
  aspectRatioMap: z.record(z.string(), z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })),
});

export type PromptStrategy = z.infer<typeof promptStrategySchema>;
export type ModelConfig = z.infer<typeof modelConfigSchema>;
