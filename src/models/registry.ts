const SUPPORTED_MODELS = ['flux'] as const;

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number];

export function isSupportedModel(id: string): id is SupportedModelId {
  return (SUPPORTED_MODELS as readonly string[]).includes(id);
}

export function getSupportedModelIds(): readonly string[] {
  return SUPPORTED_MODELS;
}
