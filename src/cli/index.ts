export type { RawAnswers, ConfirmationAction, PostGenerationAction } from './types.js';
export { collectAnswers } from './collect-answers.js';
export { askConfirmation, askPostGeneration, formatSummary } from './confirmation.js';
export { printGenerationResult, printDebugOutput, printGenerationError } from './display.js';
export { askRecoveryAction } from './recovery.js';
export type { RecoveryAction } from './recovery.js';
export type { OptionalFieldId, OptionalFieldDefinition } from './optional-fields.js';
export {
  OPTIONAL_FIELD_IDS,
  OPTIONAL_FIELDS,
  isOptionalFieldId,
  validateAndOrderOptionalFields,
} from './optional-fields.js';
