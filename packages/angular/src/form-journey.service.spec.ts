import { createForm, type Validator } from '@formjourney/core';
import { stepsConditionalPlugin } from '@formjourney/plugin-steps-conditional';
import { describe, expect, it } from 'vitest';
import { FormJourneyService } from './form-journey.service';
import type { FormJourneyMode } from './tokens';

interface Values {
  email: string;
  needsShipping: boolean;
  tags: { label: string }[];
}

const emailRequired: Validator<Values> = (v) =>
  v.email === '' ? { email: ['Required'] } : {};

const makeService = (): FormJourneyService<Values> => {
  const core = createForm<Values>({
    initialValues: { email: '', needsShipping: false, tags: [{ label: 'a' }] },
    steps: [
      { id: 'account', validate: emailRequired, fields: ['email'] },
      { id: 'review' },
    ],
  });
  return new FormJourneyService<Values>(core);
};

describe('FormJourneyService — field signals', () => {
  it('value signal reflects setValue', () => {
    const ff = makeService();
    const email = ff.value('email');
    expect(email()).toBe('');
    ff.setValue('email', 'a@b.co');
    expect(email()).toBe('a@b.co');
  });

  it('error signal tracks trigger output', async () => {
    const ff = makeService();
    const err = ff.error('email');
    expect(err()).toBeUndefined();
    await ff.trigger('current');
    expect(err()).toBe('Required');
  });

  it('touched signal flips on markTouched', () => {
    const ff = makeService();
    const touched = ff.touched('email');
    expect(touched()).toBe(false);
    ff.markTouched('email');
    expect(touched()).toBe(true);
  });

  it('derived flags update', async () => {
    const ff = makeService();
    expect(ff.isValid()).toBe(true);
    await ff.trigger('current');
    expect(ff.isValid()).toBe(false);
    expect(ff.isDirty()).toBe(false);
    ff.setValue('email', 'x');
    expect(ff.isDirty()).toBe(true);
  });
});

describe('FormJourneyService — navigation', () => {
  it('next blocks on invalid, advances when valid', async () => {
    const ff = makeService();
    expect(ff.currentStep()).toBe('account');
    expect(await ff.next()).toBe(false);
    expect(ff.currentStep()).toBe('account');
    ff.setValue('email', 'a@b.co');
    expect(await ff.next()).toBe(true);
    expect(ff.currentStep()).toBe('review');
  });
});

describe('FormJourneyService — field list', () => {
  it('append/remove/move update the items signal', () => {
    const ff = makeService();
    const items = ff.items('tags');
    expect(items().length).toBe(1);
    ff.append('tags', { label: 'b' });
    expect(items().length).toBe(2);
    ff.moveItem('tags', 0, 1);
    expect((items() as { label: string }[]).map((t) => t.label)).toEqual([
      'b',
      'a',
    ]);
    ff.removeAt('tags', 0);
    expect(items().length).toBe(1);
  });
});

describe('FormJourneyService — submit', () => {
  it('calls onValid only when valid', async () => {
    const ff = makeService();
    let called = 0;
    await ff.submit(() => {
      called += 1;
    });
    expect(called).toBe(0);
    ff.setValue('email', 'a@b.co');
    await ff.submit(() => {
      called += 1;
    });
    expect(called).toBe(1);
    expect(ff.submitCount()).toBe(2);
  });
});

const makeModedService = (
  mode: FormJourneyMode,
): FormJourneyService<Values> => {
  const core = createForm<Values>({
    initialValues: { email: '', needsShipping: false, tags: [] },
    steps: [{ id: 'account', validate: emailRequired, fields: ['email'] }],
  });
  return new FormJourneyService<Values>(core, mode);
};

describe('FormJourneyService — validation modes', () => {
  it('mode onSubmit + reValidate onChange: no error while typing, clears once invalid', async () => {
    const ff = makeModedService({
      mode: 'onSubmit',
      reValidateMode: 'onChange',
    });
    const err = ff.error('email');

    ff.setValue('email', '');
    await ff.revalidateField('email', 'change');
    expect(err()).toBeUndefined();

    await ff.trigger('current');
    expect(err()).toBe('Required');

    ff.setValue('email', 'a@b.co');
    await ff.revalidateField('email', 'change');
    expect(err()).toBeUndefined();
  });

  it('reValidate onBlur: an errored field clears on blur, not on change', async () => {
    const ff = makeModedService({ mode: 'onSubmit', reValidateMode: 'onBlur' });
    const err = ff.error('email');
    await ff.trigger('current');
    expect(err()).toBe('Required');

    ff.setValue('email', 'a@b.co');
    await ff.revalidateField('email', 'change');
    expect(err()).toBe('Required');

    await ff.revalidateField('email', 'blur');
    expect(err()).toBeUndefined();
  });

  it('mode onChange: error appears on the first keystroke', async () => {
    const ff = makeModedService({
      mode: 'onChange',
      reValidateMode: 'onChange',
    });
    const err = ff.error('email');
    ff.setValue('email', '');
    await ff.revalidateField('email', 'change');
    expect(err()).toBe('Required');
  });

  it('defaults to onSubmit + onChange when no mode is provided', async () => {
    const ff = makeService();
    const err = ff.error('email');
    ff.setValue('email', '');
    await ff.revalidateField('email', 'change');
    expect(err()).toBeUndefined();
  });
});

describe('FormJourneyService — conditional steps', () => {
  it('activeSteps reflects the conditional plugin', () => {
    const core = createForm<Values>({
      initialValues: {
        email: '',
        needsShipping: false,
        tags: [],
      },
      steps: [{ id: 'account' }, { id: 'shipping' }, { id: 'review' }],
    }).use(
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
    const ff = new FormJourneyService<Values>(core);
    expect(ff.activeSteps()).toEqual(['account', 'review']);
    ff.setValue('needsShipping', true);
    expect(ff.activeSteps()).toEqual(['account', 'shipping', 'review']);
  });
});
