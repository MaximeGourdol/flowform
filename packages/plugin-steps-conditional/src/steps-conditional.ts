import type { FormCore, Path, Plugin } from '@flowform/core';
import { evaluateCondition, type Condition } from './conditions.js';

export interface ConditionalClear<TValues> {
  readonly path: Path<TValues>;
  readonly resetTo?: unknown;
}

export interface ConditionalRule<TValues> {
  readonly stepId: string;
  readonly when: Condition<TValues>;
  readonly clears: readonly ConditionalClear<TValues>[];
}

export interface StepsConditionalOptions<TValues> {
  readonly rules: readonly ConditionalRule<TValues>[];
}

export interface StepsConditionalApi {
  readonly activeStepIds: () => readonly string[];
  readonly isActive: (stepId: string) => boolean;
  readonly sync: () => void;
}

export const stepsConditionalPlugin = <TValues>(
  options: StepsConditionalOptions<TValues>,
): Plugin<StepsConditionalApi> => {
  const rules = options.rules;
  const conditionalIds = new Set(rules.map((rule) => rule.stepId));
  const inactive = new Set<string>();

  return {
    name: 'conditionalSteps',
    install: (core) => {
      const typed = core as FormCore<TValues>;

      const clearStep = (rule: ConditionalRule<TValues>): void => {
        for (const target of rule.clears) {
          typed.store.setValue(target.path, target.resetTo as never);
        }
      };

      const sync = (): void => {
        const values = typed.store.getState().values;
        for (const rule of rules) {
          const matches = evaluateCondition(rule.when, values);
          if (matches) {
            inactive.delete(rule.stepId);
            continue;
          }
          if (!inactive.has(rule.stepId)) {
            clearStep(rule);
          }
          inactive.add(rule.stepId);
        }
      };

      const isActive = (stepId: string): boolean =>
        !conditionalIds.has(stepId) || !inactive.has(stepId);

      const activeStepIds = (): readonly string[] =>
        typed.steps.steps.map((step) => step.id).filter((id) => isActive(id));

      typed.bus.on('field:change', () => {
        sync();
      });

      typed.steps.setActiveStepResolver(activeStepIds);

      sync();

      return { activeStepIds, isActive, sync };
    },
    uninstall: (core) => {
      (core as FormCore<TValues>).steps.setActiveStepResolver(null);
    },
  };
};
