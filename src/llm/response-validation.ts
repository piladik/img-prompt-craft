import { z } from 'zod';
import type { IntermediatePrompt } from '../domain/schema.js';

export interface ValidationSuccess {
  success: true;
  cleanedPrompt: string;
}

export interface ValidationFailure {
  success: false;
  reason: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  'young-woman': ['woman', 'female', 'girl', 'lady', 'she', 'her'],
  'young-man': ['man', 'male', 'boy', 'guy', 'he', 'his'],
};

const METADATA_PATTERNS = [
  /^```/m,
  /^#+\s/m,
  /\*\*/,
  /^Here(?:'s| is)/im,
  /^Sure[,!]/im,
  /^I (?:have |will |can |would )/im,
  /^Note:/im,
  /^Rewritten prompt:/im,
  /^Output:/im,
  /"rewrittenPrompt"/,
  /\{[\s\S]*".*":.*\}/,
];

function containsSubject(response: string, subject: string): boolean {
  const keywords = SUBJECT_KEYWORDS[subject];
  if (!keywords) return true;

  const lower = response.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function containsMetadata(response: string): boolean {
  return METADATA_PATTERNS.some((pattern) => pattern.test(response));
}

export function validateLlmResponse(
  response: string,
  intermediate: IntermediatePrompt,
  maxPromptLength: number,
): ValidationResult {
  const trimmed = response.trim();

  if (trimmed.length === 0) {
    return { success: false, reason: 'LLM returned an empty response' };
  }

  if (trimmed.length > maxPromptLength) {
    return {
      success: false,
      reason: `LLM response exceeds max length (${trimmed.length}/${maxPromptLength})`,
    };
  }

  if (!containsSubject(trimmed, intermediate.subject)) {
    return {
      success: false,
      reason: 'LLM response must reference the original subject',
    };
  }

  if (containsMetadata(trimmed)) {
    return {
      success: false,
      reason: 'LLM response must not contain metadata or instructions',
    };
  }

  return { success: true, cleanedPrompt: trimmed };
}
