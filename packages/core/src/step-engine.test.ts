import { describe, expect, it, vi } from 'vitest';
import { createEventBus, type EventBus } from './event-bus.js';
import { createStepEngine, type Step, type StepEngine } from './step-engine.js';
import type { ErrorMap } from './types.js';

interface Values {
  name: string;
}

let bus: EventBus;

const build = (
  steps: readonly Step<Values>[],
  values: Values = { name: '' },
  initialStepId?: string,
): StepEngine<Values> => {
  bus = createEventBus();
  return createStepEngine<Values>({
    steps,
    ...(initialStepId === undefined ? {} : { initialStepId }),
    getValues: () => values,
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
