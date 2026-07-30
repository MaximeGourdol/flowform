import { beforeEach, describe, expect, it } from 'vitest';
import { createForm, type FormCore } from '@flowform/core';
import { stepsConditionalPlugin } from './steps-conditional.js';

interface Values {
  account: { email: string };
  needsShipping: boolean;
  shipping: { address: string; zip: string };
  country: string;
  gift: { message: string };
}

const initialValues: Values = {
  account: { email: '' },
  needsShipping: false,
  shipping: { address: '', zip: '' },
  country: '',
  gift: { message: '' },
};

const makeForm = (): FormCore<Values> =>
  createForm<Values>({
    initialValues,
    steps: [
      { id: 'account' },
      { id: 'shipping' },
      { id: 'gift' },
      { id: 'payment' },
    ],
  });

let form: FormCore<Values>;

beforeEach(() => {
  form = makeForm();
});

describe('stepsConditionalPlugin — activation', () => {
  it('exposes its API under core.conditionalSteps', () => {
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [],
          },
        ],
      }),
    );
    expect(typeof form.conditionalSteps.activeStepIds).toBe('function');
  });

  it('removes a conditional step whose condition is false at install', () => {
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'country', equals: 'FR' },
            clears: [],
          },
        ],
      }),
    );
    expect(form.conditionalSteps.activeStepIds()).toEqual([
      'account',
      'gift',
      'payment',
    ]);
    expect(form.conditionalSteps.isActive('shipping')).toBe(false);
  });

  it('keeps a conditional step whose condition is true at install', () => {
    form.store.setValue('country', 'FR');
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'country', equals: 'FR' },
            clears: [],
          },
        ],
      }),
    );
    expect(form.conditionalSteps.activeStepIds()).toEqual([
      'account',
      'shipping',
      'gift',
      'payment',
    ]);
    expect(form.conditionalSteps.isActive('shipping')).toBe(true);
  });

  it('leaves non-conditional steps always active', () => {
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'country', equals: 'FR' },
            clears: [],
          },
        ],
      }),
    );
    expect(form.conditionalSteps.isActive('account')).toBe(true);
    expect(form.conditionalSteps.isActive('payment')).toBe(true);
  });
});

describe('stepsConditionalPlugin — reactivity', () => {
  it('activates a step when a field:change makes the condition true', () => {
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [],
          },
        ],
      }),
    );
    expect(form.conditionalSteps.isActive('shipping')).toBe(false);

    form.store.setValue('needsShipping', true);
    form.bus.emit('field:change', { path: 'needsShipping', value: true });
    expect(form.conditionalSteps.isActive('shipping')).toBe(true);
  });

  it('removes a step when a field:change makes the condition false', () => {
    form.store.setValue('country', 'FR');
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'country', equals: 'FR' },
            clears: [],
          },
        ],
      }),
    );
    expect(form.conditionalSteps.isActive('shipping')).toBe(true);

    form.store.setValue('country', 'US');
    form.bus.emit('field:change', { path: 'country', value: 'US' });
    expect(form.conditionalSteps.isActive('shipping')).toBe(false);
  });
});

describe('stepsConditionalPlugin — auto-clear on removal', () => {
  it('clears declared fields when the step is removed', () => {
    form.store.setValue('needsShipping', true);
    form.store.setValue('shipping.address', '10 rue de la Paix');
    form.store.setValue('shipping.zip', '75001');
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [
              { path: 'shipping.address', resetTo: '' },
              { path: 'shipping.zip', resetTo: '' },
            ],
          },
        ],
      }),
    );
    expect(form.conditionalSteps.isActive('shipping')).toBe(true);

    form.store.setValue('needsShipping', false);
    form.bus.emit('field:change', { path: 'needsShipping', value: false });

    expect(form.conditionalSteps.isActive('shipping')).toBe(false);
    expect(form.store.getValue('shipping.address')).toBe('');
    expect(form.store.getValue('shipping.zip')).toBe('');
  });

  it('does not clear fields while the step stays active', () => {
    form.store.setValue('needsShipping', true);
    form.store.setValue('shipping.zip', '75001');
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [{ path: 'shipping.zip', resetTo: '' }],
          },
        ],
      }),
    );
    form.bus.emit('field:change', { path: 'needsShipping', value: true });
    expect(form.store.getValue('shipping.zip')).toBe('75001');
  });

  it('does not re-clear fields on a second removal sync when already inactive', () => {
    form.store.setValue('needsShipping', true);
    form.store.setValue('shipping.zip', '75001');
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [{ path: 'shipping.zip', resetTo: '' }],
          },
        ],
      }),
    );
    form.store.setValue('needsShipping', false);
    form.bus.emit('field:change', { path: 'needsShipping', value: false });
    expect(form.store.getValue('shipping.zip')).toBe('');

    form.store.setValue('shipping.zip', 'typed-again');
    form.conditionalSteps.sync();
    expect(form.store.getValue('shipping.zip')).toBe('typed-again');
  });

  it('uses undefined when no resetTo is provided', () => {
    form.store.setValue('needsShipping', true);
    form.store.setValue('shipping.address', 'somewhere');
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [{ path: 'shipping.address' }],
          },
        ],
      }),
    );
    form.store.setValue('needsShipping', false);
    form.bus.emit('field:change', { path: 'needsShipping', value: false });
    expect(form.store.getValue('shipping.address')).toBeUndefined();
  });
});

describe('stepsConditionalPlugin — multiple rules', () => {
  it('handles several conditional steps independently', () => {
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [],
          },
          {
            stepId: 'gift',
            when: { field: 'gift.message', filled: true },
            clears: [{ path: 'gift.message', resetTo: '' }],
          },
        ],
      }),
    );
    expect(form.conditionalSteps.activeStepIds()).toEqual([
      'account',
      'payment',
    ]);

    form.store.setValue('needsShipping', true);
    form.bus.emit('field:change', { path: 'needsShipping', value: true });
    form.store.setValue('gift.message', 'Happy birthday');
    form.bus.emit('field:change', { path: 'gift.message', value: 'x' });
    expect(form.conditionalSteps.activeStepIds()).toEqual([
      'account',
      'shipping',
      'gift',
      'payment',
    ]);
  });
});

describe('stepsConditionalPlugin — manual sync', () => {
  it('recomputes active steps on demand via sync()', () => {
    form.use(
      stepsConditionalPlugin<Values>({
        rules: [
          {
            stepId: 'shipping',
            when: { field: 'needsShipping', filled: true },
            clears: [],
          },
        ],
      }),
    );
    expect(form.conditionalSteps.isActive('shipping')).toBe(false);

    form.store.setValue('needsShipping', true);
    form.conditionalSteps.sync();
    expect(form.conditionalSteps.isActive('shipping')).toBe(true);
  });
});
