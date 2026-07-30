import { describe, expect, it, vi } from 'vitest';
import { createForm, type FormCore } from './create-form.js';
import type { Step } from './step-engine.js';
import type { ErrorMap, Validator } from './types.js';

interface SignupValues {
  account: { email: string; password: string };
  profile: { displayName: string };
  terms: { accepted: boolean };
}

const required =
  (
    path: string,
    read: (values: SignupValues) => unknown,
  ): Validator<SignupValues> =>
  (values): ErrorMap => {
    const value = read(values);
    if (value === '' || value === false || value === undefined) {
      return { [path]: ['required'] };
    }
    return {};
  };

const buildSignupForm = (): FormCore<SignupValues> => {
  const steps: readonly Step<SignupValues>[] = [
    {
      id: 'account',
      validate: required('account.email', (v) => v.account.email),
    },
    {
      id: 'profile',
      validate: required('profile.displayName', (v) => v.profile.displayName),
    },
    {
      id: 'terms',
      validate: required('terms.accepted', (v) => v.terms.accepted),
    },
  ];

  return createForm<SignupValues>({
    initialValues: {
      account: { email: '', password: '' },
      profile: { displayName: '' },
      terms: { accepted: false },
    },
    steps,
  });
};

describe('3-step signup flow (store + event bus + step engine, no plugin)', () => {
  it('walks the full happy path across the three steps', async () => {
    const form = buildSignupForm();
    const changes: { from: string | null; to: string }[] = [];
    form.bus.on('step:change', (payload) => changes.push(payload));

    expect(form.steps.currentStep()).toBe('account');

    form.store.setValue('account.email', 'ada@example.com');
    await expect(form.steps.goNext()).resolves.toBe(true);
    expect(form.steps.currentStep()).toBe('profile');

    form.store.setValue('profile.displayName', 'Ada');
    await expect(form.steps.goNext()).resolves.toBe(true);
    expect(form.steps.currentStep()).toBe('terms');

    form.store.setValue('terms.accepted', true);
    await expect(form.steps.canGoNext()).resolves.toBe(true);

    expect(changes).toEqual([
      { from: 'account', to: 'profile' },
      { from: 'profile', to: 'terms' },
    ]);
  });

  it('blocks navigation while the current step is invalid, then unblocks', async () => {
    const form = buildSignupForm();

    await expect(form.steps.goNext()).resolves.toBe(false);
    expect(form.steps.currentStep()).toBe('account');

    form.store.setValue('account.email', 'ada@example.com');
    await expect(form.steps.goNext()).resolves.toBe(true);
    expect(form.steps.currentStep()).toBe('profile');
  });

  it('validates against live store values read through getValues', async () => {
    const form = buildSignupForm();

    form.store.setValue('account.email', 'ada@example.com');
    await expect(form.steps.canGoNext()).resolves.toBe(true);

    form.store.setValue('account.email', '');
    await expect(form.steps.canGoNext()).resolves.toBe(false);
  });

  it('stores validation errors when the app pushes them into the store', async () => {
    const form = buildSignupForm();
    const step = form.steps.steps[form.steps.currentIndex()];
    if (step?.validate === undefined) {
      throw new Error('expected the first step to have a validator');
    }
    const errors = await step.validate(form.store.getState().values, {
      currentStepId: 'account',
      trigger: 'step',
    });
    form.store.setErrors(errors);

    expect(form.store.getState().errors).toEqual({
      'account.email': ['required'],
    });
  });

  it('lets the app bridge store changes onto the event bus', () => {
    const form = buildSignupForm();
    const onChange = vi.fn();
    form.bus.on('field:change', onChange);

    form.store.subscribe('profile.displayName', (value) => {
      form.bus.emit('field:change', { path: 'profile.displayName', value });
    });
    form.store.setValue('profile.displayName', 'Grace');

    expect(onChange).toHaveBeenCalledWith({
      path: 'profile.displayName',
      value: 'Grace',
    });
  });

  it('supports going back without re-validating', async () => {
    const form = buildSignupForm();
    form.store.setValue('account.email', 'ada@example.com');
    await form.steps.goNext();
    expect(form.steps.currentStep()).toBe('profile');

    expect(form.steps.goPrev()).toBe(true);
    expect(form.steps.currentStep()).toBe('account');
  });
});
