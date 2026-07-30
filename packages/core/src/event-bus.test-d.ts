import { describe, expectTypeOf, it } from 'vitest';
import { createEventBus, type EventMap } from './event-bus.js';

const bus = createEventBus();

describe('emit typing', () => {
  it('infers the payload type from the event key', () => {
    bus.emit('field:change', { path: 'a', value: 1 });
    bus.emit('step:change', { from: null, to: 'step-2' });
  });

  it('rejects a payload that does not match the event key', () => {
    // @ts-expect-error - missing `value`
    bus.emit('field:change', { path: 'a' });
    // @ts-expect-error - unknown event key
    bus.emit('does:not:exist', {});
  });
});

describe('on typing', () => {
  it('infers the handler payload type from the event key', () => {
    bus.on('field:change', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<EventMap['field:change']>();
      expectTypeOf(payload.value).toEqualTypeOf<unknown>();
    });
  });
});
