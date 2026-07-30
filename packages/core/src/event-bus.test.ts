import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventBus, type EventBus } from './event-bus.js';

let bus: EventBus;

beforeEach(() => {
  bus = createEventBus();
});

describe('emit / on', () => {
  it('calls a handler subscribed to the emitted event with its payload', () => {
    const handler = vi.fn();
    bus.on('field:change', handler);
    bus.emit('field:change', { path: 'user.name', value: 'x' });
    expect(handler).toHaveBeenCalledWith({ path: 'user.name', value: 'x' });
  });

  it('does not call handlers of other events', () => {
    const handler = vi.fn();
    bus.on('field:blur', handler);
    bus.emit('field:change', { path: 'a', value: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple handlers for the same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('submit:start', h1);
    bus.on('submit:start', h2);
    bus.emit('submit:start', {});
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });
});

describe('off / unsubscribe', () => {
  it('stops calling a handler removed via off()', () => {
    const handler = vi.fn();
    bus.on('field:blur', handler);
    bus.off('field:blur', handler);
    bus.emit('field:blur', { path: 'a' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('stops calling a handler removed via the returned unsubscribe', () => {
    const handler = vi.fn();
    const unsub = bus.on('field:blur', handler);
    unsub();
    bus.emit('field:blur', { path: 'a' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('off() on an unknown handler is a no-op (no throw)', () => {
    expect(() => {
      bus.off('field:blur', vi.fn());
    }).not.toThrow();
  });
});
