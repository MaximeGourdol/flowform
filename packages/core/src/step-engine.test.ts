import { describe, expect, it, vi } from 'vitest';
import { createEventBus, type EventBus } from './event-bus.js';
import { createStepEngine, type Step, type StepEngine } from './step-engine.js';
import { createStore, type FormStore } from './store.js';
import type { ErrorMap } from './types.js';

interface Values {
  name: string;
}

let bus: EventBus;
let store: FormStore<Values>;

const build = (
  steps: readonly Step<Values>[],
  values: Values = { name: '' },
  initialStepId?: string,
  getActiveStepIds?: () => readonly string[],
): StepEngine<Values> => {
  bus = createEventBus();
  store = createStore<Values>(values);
  return createStepEngine<Values>({
    steps,
    ...(initialStepId === undefined ? {} : { initialStepId }),
    ...(getActiveStepIds === undefined ? {} : { getActiveStepIds }),
    getValues: () => store.getState().values,
    store,
    bus,
  });
};

const s = (id: string, validate?: Step<Values>['validate']): Step<Values> =>
  validate === undefined ? { id } : { id, validate };

describe('initial position', () => {
  it('starts on the first step by default', () => {
    const engine = build([s('a'), s('b')]);
    expect(engine.currentStep()).toBe('a');
    expect(engine.currentIndex()).toBe(0);
  });

  it('starts on the provided initialStepId', () => {
    const engine = build([s('a'), s('b'), s('c')], { name: '' }, 'b');
    expect(engine.currentStep()).toBe('b');
    expect(engine.currentIndex()).toBe(1);
  });

  it('reports null current step for an empty step list', () => {
    const engine = build([]);
    expect(engine.currentStep()).toBeNull();
    expect(engine.currentIndex()).toBe(-1);
  });
});

describe('goNext', () => {
  it('advances to the next step and returns true', async () => {
    const engine = build([s('a'), s('b')]);
    await expect(engine.goNext()).resolves.toBe(true);
    expect(engine.currentStep()).toBe('b');
  });

  it('does not advance past the last step and returns false', async () => {
    const engine = build([s('a'), s('b')], { name: '' }, 'b');
    await expect(engine.goNext()).resolves.toBe(false);
    expect(engine.currentStep()).toBe('b');
  });

  it('emits step:change with from/to on a successful move', async () => {
    const engine = build([s('a'), s('b')]);
    const handler = vi.fn();
    bus.on('step:change', handler);
    await engine.goNext();
    expect(handler).toHaveBeenCalledWith({ from: 'a', to: 'b' });
  });

  it('does not emit step:change when blocked at the last step', async () => {
    const engine = build([s('a')], { name: '' }, 'a');
    const handler = vi.fn();
    bus.on('step:change', handler);
    await engine.goNext();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('goPrev', () => {
  it('moves back and returns true', () => {
    const engine = build([s('a'), s('b')], { name: '' }, 'b');
    expect(engine.goPrev()).toBe(true);
    expect(engine.currentStep()).toBe('a');
  });

  it('does not move before the first step and returns false', () => {
    const engine = build([s('a'), s('b')]);
    expect(engine.goPrev()).toBe(false);
    expect(engine.currentStep()).toBe('a');
  });

  it('emits step:change on a successful move back', () => {
    const engine = build([s('a'), s('b')], { name: '' }, 'b');
    const handler = vi.fn();
    bus.on('step:change', handler);
    engine.goPrev();
    expect(handler).toHaveBeenCalledWith({ from: 'b', to: 'a' });
  });
});

describe('goTo', () => {
  it('jumps to a valid step id and returns true', () => {
    const engine = build([s('a'), s('b'), s('c')]);
    expect(engine.goTo('c')).toBe(true);
    expect(engine.currentStep()).toBe('c');
  });

  it('returns false and does not move for an unknown step id', () => {
    const engine = build([s('a'), s('b')]);
    expect(engine.goTo('nope')).toBe(false);
    expect(engine.currentStep()).toBe('a');
  });

  it('does not emit step:change for an unknown step id', () => {
    const engine = build([s('a'), s('b')]);
    const handler = vi.fn();
    bus.on('step:change', handler);
    engine.goTo('nope');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('canGoNext', () => {
  it('resolves true when the current step has no validator', async () => {
    const engine = build([s('a'), s('b')]);
    await expect(engine.canGoNext()).resolves.toBe(true);
  });

  it('resolves true when the injected validator returns no errors', async () => {
    const engine = build([s('a', () => ({})), s('b')]);
    await expect(engine.canGoNext()).resolves.toBe(true);
  });

  it('resolves false when the injected validator returns errors', async () => {
    const errors: ErrorMap = { name: ['required'] };
    const engine = build([s('a', () => errors), s('b')]);
    await expect(engine.canGoNext()).resolves.toBe(false);
  });

  it('supports an async validator', async () => {
    const engine = build([
      s('a', () => Promise.resolve({ name: ['bad'] })),
      s('b'),
    ]);
    await expect(engine.canGoNext()).resolves.toBe(false);
  });

  it('passes the current values to the validator', async () => {
    const validate = vi.fn(() => ({}));
    const engine = build([s('a', validate), s('b')], { name: 'Ada' });
    await engine.canGoNext();
    expect(validate).toHaveBeenCalledWith(
      { name: 'Ada' },
      expect.objectContaining({ currentStepId: 'a' }),
    );
  });
});

describe('goNext gated by canGoNext', () => {
  it('does not advance when the validator blocks', async () => {
    const engine = build([s('a', () => ({ name: ['required'] })), s('b')]);
    await expect(engine.goNext()).resolves.toBe(false);
    expect(engine.currentStep()).toBe('a');
  });

  it('advances when the validator passes', async () => {
    const engine = build([s('a', () => ({})), s('b')]);
    await expect(engine.goNext()).resolves.toBe(true);
    expect(engine.currentStep()).toBe('b');
  });
});

describe('trigger — posts errors to the store', () => {
  const required: Step<Values>['validate'] = (v) =>
    v.name === '' ? { name: ['required'] } : {};

  it("trigger('current') writes the current step errors into the store", async () => {
    const engine = build([s('a', required), s('b')]);
    const ok = await engine.trigger('current');
    expect(ok).toBe(false);
    expect(store.getState().errors.name).toEqual(['required']);
  });

  it("trigger('current') clears when valid", async () => {
    const engine = build([s('a', required), s('b')], { name: 'Ada' });
    const ok = await engine.trigger();
    expect(ok).toBe(true);
    expect(store.getState().errors.name).toBeUndefined();
  });

  it('trigger({ step }) validates a named step', async () => {
    const engine = build([s('a'), s('b', required)]);
    const ok = await engine.trigger({ step: 'b' });
    expect(ok).toBe(false);
    expect(store.getState().errors.name).toEqual(['required']);
  });

  it("trigger('all') merges errors across active steps", async () => {
    const engine = build([
      s('a', required),
      s('b', () => ({ other: ['bad'] })),
    ]);
    const ok = await engine.trigger('all');
    expect(ok).toBe(false);
    expect(Object.keys(store.getState().errors).sort()).toEqual([
      'name',
      'other',
    ]);
  });

  it('emits validate:start and validate:end', async () => {
    const engine = build([s('a', required)]);
    const start = vi.fn();
    const end = vi.fn();
    bus.on('validate:start', start);
    bus.on('validate:end', end);
    await engine.trigger('current');
    expect(start).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });
});

describe('step fields ownership', () => {
  it('scopes a step validator output to its declared fields', async () => {
    const step: Step<Values> = {
      id: 'a',
      fields: ['name'],
      validate: () => ({ name: ['bad'], stray: ['nope'] }),
    };
    const engine = build([step]);
    await engine.trigger('current');
    const { errors } = store.getState();
    expect(errors.name).toEqual(['bad']);
    expect(errors.stray).toBeUndefined();
  });
});

describe('active navigation', () => {
  const active = ['a', 'c'];
  const makeConditional = (): StepEngine<Values> =>
    build([s('a'), s('b'), s('c')], { name: '' }, undefined, () => active);

  it('activeStepIds reflects the injected resolver', () => {
    const engine = makeConditional();
    expect(engine.activeStepIds()).toEqual(['a', 'c']);
    expect(engine.isStepActive('b')).toBe(false);
  });

  it('goNextActive skips inactive steps', async () => {
    const engine = makeConditional();
    await expect(engine.goNextActive()).resolves.toBe(true);
    expect(engine.currentStep()).toBe('c');
  });

  it('goPrevActive skips inactive steps', () => {
    const engine = makeConditional();
    engine.goTo('c');
    expect(engine.goPrevActive()).toBe(true);
    expect(engine.currentStep()).toBe('a');
  });

  it('activeIndex is the position within the active list', () => {
    const engine = makeConditional();
    engine.goTo('c');
    expect(engine.activeIndex()).toBe(1);
  });

  it('defaults to all steps when no resolver is given', () => {
    const engine = build([s('a'), s('b')]);
    expect(engine.activeStepIds()).toEqual(['a', 'b']);
  });
});
