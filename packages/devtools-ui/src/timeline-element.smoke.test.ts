import { createForm, type FormCore } from '@formjourney/core';
import { devtoolsPlugin, type DevtoolsApi } from '@formjourney/plugin-devtools';
import { afterEach, describe, expect, it } from 'vitest';
import { registerTimeline, TIMELINE_TAG } from './register.js';
import { FormJourneyDevtoolsTimeline } from './timeline-element.js';

interface Values {
  name: string;
}

let counter = 0;
const now = (): number => ++counter;

const makeApi = (): { api: DevtoolsApi; form: FormCore<Values> } => {
  const form = createForm<Values>({
    initialValues: { name: '' },
    steps: [{ id: 'a' }],
  }).use(devtoolsPlugin({ now }));
  const api = (form as unknown as { devtools: DevtoolsApi }).devtools;
  return { api, form };
};

const mounted: HTMLElement[] = [];
const mount = (el: HTMLElement): HTMLElement => {
  document.body.append(el);
  mounted.push(el);
  return el;
};

afterEach(() => {
  for (const el of mounted.splice(0)) {
    el.remove();
  }
});

describe('devtools-ui — registration', () => {
  it('defines the custom element under its tag', () => {
    registerTimeline();
    expect(customElements.get(TIMELINE_TAG)).toBe(FormJourneyDevtoolsTimeline);
  });

  it('creates an instance through the registered tag', () => {
    registerTimeline();
    const el = mount(document.createElement(TIMELINE_TAG));
    expect(el).toBeInstanceOf(FormJourneyDevtoolsTimeline);
  });
});

describe('devtools-ui — mount smoke', () => {
  it('renders a shadow root without a live api', () => {
    const el = mount(
      new FormJourneyDevtoolsTimeline(),
    ) as FormJourneyDevtoolsTimeline;
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.querySelector('.grid')).not.toBeNull();
  });

  it('accepts a live DevtoolsApi and reflects logged events without throwing', async () => {
    const { api, form } = makeApi();
    const el = mount(
      new FormJourneyDevtoolsTimeline(),
    ) as FormJourneyDevtoolsTimeline;

    expect(() => {
      el.setApi(api);
    }).not.toThrow();

    form.store.setValue('name', 'Ada');
    form.bus.emit('field:change', { path: 'name', value: 'Ada' });
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });

    const list = el.shadowRoot?.querySelector('.list');
    expect(list?.textContent).toContain('field:change');
  });

  it('unsubscribes on disconnect without throwing', () => {
    const { api, form } = makeApi();
    const el = mount(
      new FormJourneyDevtoolsTimeline(),
    ) as FormJourneyDevtoolsTimeline;
    el.setApi(api);

    el.remove();
    const emit = (): void => {
      form.bus.emit('field:change', { path: 'name', value: 'x' });
    };
    expect(emit).not.toThrow();
  });
});
