export { stepsConditionalPlugin } from './steps-conditional.js';
export type {
  ConditionalClear,
  ConditionalRule,
  StepsConditionalApi,
  StepsConditionalOptions,
} from './steps-conditional.js';

export { evaluateCondition } from './conditions.js';
export type {
  Condition,
  EqualsCondition,
  FilledCondition,
} from './conditions.js';

import type { StepsConditionalApi } from './steps-conditional.js';

declare module '@formjourney/core' {
  interface FormPluginRegistry {
    conditionalSteps: StepsConditionalApi;
  }
}
