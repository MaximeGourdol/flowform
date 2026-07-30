import { describe, expectTypeOf, it } from 'vitest';
import { createForm, type FormCore } from '@flowform/core';
import {
  stepsConditionalPlugin,
  type StepsConditionalApi,
} from './steps-conditional.js';

interface Values {
  country: string;
  shipping: { zip: string };
}

describe('registry augmentation', () => {
  it('types form.conditionalSteps via the registry', () => {
    const form: FormCore<Values> = createForm<Values>({
      initialValues: { country: '', shipping: { zip: '' } },
      steps: [{ id: 'a' }],
    });
    expectTypeOf(form.conditionalSteps).toEqualTypeOf<StepsConditionalApi>();
    expectTypeOf(form.conditionalSteps.isActive).parameter(0).toBeString();
    expectTypeOf(form.conditionalSteps.activeStepIds()).toEqualTypeOf<
      readonly string[]
    >();
  });

  it('accepts type-safe field paths in rules', () => {
    stepsConditionalPlugin<Values>({
      rules: [
        {
          stepId: 'shipping',
          when: { field: 'country', equals: 'FR' },
          clears: [{ path: 'shipping.zip', resetTo: '' }],
        },
      ],
    });
  });
});
