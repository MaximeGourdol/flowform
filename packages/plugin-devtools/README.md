# @formjourney/plugin-devtools

A [`@formjourney/core`](../core) plugin that records what happens on the event bus.
It keeps a versioned log of events, a state snapshot per event, and can replay a
range. It renders nothing — pair it with
[`@formjourney/devtools-ui`](../devtools-ui) for a visual timeline.

## Install

```bash
pnpm add @formjourney/plugin-devtools @formjourney/core
```

## Usage

```ts
import { createForm } from '@formjourney/core';
import { devtoolsPlugin } from '@formjourney/plugin-devtools';

const form = createForm({ initialValues: { email: '' } }).use(devtoolsPlugin());

form.devtools.getEventLog(); // versioned envelopes, each with a state snapshot
form.devtools.getSnapshot(); // current { values, errors, touched, ... }

const off = form.devtools.subscribeToLog((entry) => console.log(entry.type));
off();

form.devtools.clearLog();
form.devtools.replay(0, 5); // re-emit logged events 0..5 on the bus
```

## Options

```ts
devtoolsPlugin({
  maxEntries: 1000, // ring-buffer cap on the log
  events: ['field:change', 'step:change'], // which bus events to record (default: all)
  now: () => Date.now(), // timestamp source, injectable for tests
});
```

Each log entry is a versioned envelope: `{ v, type, payload, timestamp,
snapshot }`. The snapshot lets a UI show form state at the moment of any event
(time travel) without re-running anything.

## License

MIT
