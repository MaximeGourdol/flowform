import { describe, expect, it, vi } from 'vitest';
import { createForm, type FormCore } from './create-form.js';
import type { EventMap } from './event-bus.js';
import type { Step, Validator } from './index.js';

interface Values {
  email: string;
  needsShipping: boolean;
  address: string;
}

const emailRequired: Validator<Values> = (v) =>
  v.email === '' ? { email: ['Email required'] } : {};

const addressRequired: Validator<Values> = (v) =>
  v.address === '' ? { address: ['Address required'] } : {};

const steps: readonly Step<Values>[] = [
  { id: 'account', validate: emailRequired, fields: ['email'] },
  { id: 'shipping', validate: addressRequired, fields: ['address'] },
  { id: 'review' },
];

const make = (getActiveStepIds?: () => readonly string[]): FormCore<Values> =>
  createForm<Values>({
    initialValues: { email: '', needsShipping: false, address: '' },
    steps,
    ...(getActiveStepIds ? { getActiveStepIds } : {}),
  });

describe('core.submit lifecycle', () => {
  it('increments submitCount', async () => {
    const form = make();
    await form.submit();
    await form.submit();
    expect(form.store.getState().submitCount).toBe(2);
  });

  it('toggles isSubmitting around the submit', async () => {
    const form = make();
    const seen: boolean[] = [];
    form.bus.on('submit:start', () => {
      seen.push(form.store.getState().isSubmitting);
    });
    await form.submit();
    expect(seen).toEqual([true]);
    expect(form.store.getState().isSubmitting).toBe(false);
  });

  it('emits submit:start and submit:end with ok flag', async () => {
    const form = make();
    form.store.setValue('email', 'a@b.co');
    form.store.setValue('address', 'x');
    const start = vi.fn();
    const end = vi.fn();
    form.bus.on('submit:start', start);
    form.bus.on('submit:end', (p: EventMap['submit:end']) => {
      end(p.ok);
    });
    await form.submit();
    expect(start).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledWith(true);
  });

  it('calls onValid with the values only when valid', async () => {
    const form = make();
    const onValid = vi.fn();
    form.store.setValue('email', '');
    await form.submit(onValid);
    expect(onValid).not.toHaveBeenCalled();

    form.store.setValue('email', 'a@b.co');
    form.store.setValue('address', 'x');
    await form.submit(onValid);
    expect(onValid).toHaveBeenCalledWith({
      email: 'a@b.co',
      needsShipping: false,
      address: 'x',
    });
  });

  it('returns a SubmitResult with ok/values/errors', async () => {
    const form = make();
    const result = await form.submit();
    expect(result.ok).toBe(false);
    expect(result.errors.email).toEqual(['Email required']);
    expect(result.values.email).toBe('');
  });

  it('populates the store errors from all steps', async () => {
    const form = make();
    await form.submit();
    const { errors } = form.store.getState();
    expect(errors.email).toEqual(['Email required']);
    expect(errors.address).toEqual(['Address required']);
  });
});

describe('core.submit multi-step — active vs inactive', () => {
  it('does not validate an inactive step (would otherwise block)', async () => {
    const active = ['account', 'review'];
    const form = make(() => active);
    form.store.setValue('email', 'a@b.co');
    const result = await form.submit();
    expect(result.ok).toBe(true);
    expect(form.store.getState().errors.address).toBeUndefined();
  });

  it('validates a step once it becomes active', async () => {
    let active = ['account', 'review'];
    const form = make(() => active);
    form.store.setValue('email', 'a@b.co');
    await expect(form.submit()).resolves.toMatchObject({ ok: true });

    active = ['account', 'shipping', 'review'];
    const result = await form.submit();
    expect(result.ok).toBe(false);
    expect(result.errors.address).toEqual(['Address required']);
  });
});
