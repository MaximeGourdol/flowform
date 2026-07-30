import type { ErrorMap, Unsubscribe, ValidationContext } from './types.js';

export interface EventMap {
  'field:change': { path: string; value: unknown };
  'field:blur': { path: string };
  'step:change': { from: string | null; to: string };
  'validate:start': { trigger: ValidationContext['trigger'] };
  'validate:end': { errors: ErrorMap };
  'submit:start': Record<never, never>;
  'submit:end': { errors: ErrorMap; ok: boolean };
}

export type EventKey = keyof EventMap;
export type EventHandler<K extends EventKey> = (payload: EventMap[K]) => void;

export interface EventBus {
  emit<K extends EventKey>(event: K, payload: EventMap[K]): void;
  on<K extends EventKey>(event: K, handler: EventHandler<K>): Unsubscribe;
  off<K extends EventKey>(event: K, handler: EventHandler<K>): void;
}

type AnyHandler = (payload: unknown) => void;

export const createEventBus = (): EventBus => {
  const registry = new Map<EventKey, Set<AnyHandler>>();

  const emit = <K extends EventKey>(event: K, payload: EventMap[K]): void => {
    const handlers = registry.get(event);
    if (handlers === undefined) {
      return;
    }
    for (const handler of [...handlers]) {
      handler(payload);
    }
  };

  const off = <K extends EventKey>(
    event: K,
    handler: EventHandler<K>,
  ): void => {
    const handlers = registry.get(event);
    if (handlers === undefined) {
      return;
    }
    handlers.delete(handler as AnyHandler);
    if (handlers.size === 0) {
      registry.delete(event);
    }
  };

  const on = <K extends EventKey>(
    event: K,
    handler: EventHandler<K>,
  ): Unsubscribe => {
    const handlers = registry.get(event) ?? new Set<AnyHandler>();
    handlers.add(handler as AnyHandler);
    registry.set(event, handlers);
    return () => {
      off(event, handler);
    };
  };

  return { emit, on, off };
};
