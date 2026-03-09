import { select } from '@inquirer/prompts';

export type RecoveryAction = 'retry-generation' | 'restart-flow' | 'exit';

export async function askRecoveryAction(options?: {
  allowRetry?: boolean;
}): Promise<RecoveryAction> {
  const allowRetry = options?.allowRetry ?? true;

  const choices: { name: string; value: RecoveryAction }[] = [];

  if (allowRetry) {
    choices.push({
      name: 'Retry generation with the same answers',
      value: 'retry-generation',
    });
  }

  choices.push(
    { name: 'Restart from the beginning', value: 'restart-flow' },
    { name: 'Exit', value: 'exit' },
  );

  return select({ message: 'How would you like to proceed?', choices });
}
