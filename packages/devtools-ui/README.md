# @flowform/devtools-ui

A web component that renders the [`@flowform/plugin-devtools`](../plugin-devtools)
timeline: the event log on one side, form state on the other, with click-to-
inspect on any event. Shadow DOM, no UI-framework dependency, works anywhere
custom elements do.

## Install

```bash
pnpm add @flowform/devtools-ui @flowform/plugin-devtools
```

## Usage

Import the register entry once to define the element, then hand it the plugin
API:

```ts
import '@flowform/devtools-ui/register';

const el = document.querySelector('flowform-devtools-timeline');
el.setApi(form.devtools);
```

```html
<flowform-devtools-timeline></flowform-devtools-timeline>
```

The timeline subscribes to the devtools log and updates live. Clicking an event
shows the form-state snapshot captured at that point; a Live button returns to
the latest.

The main entry (`@flowform/devtools-ui`) exports the element class and its tag
name without side effects, so you can define it under a custom tag yourself. The
`/register` entry is the side-effecting shortcut that calls
`customElements.define` for you.

### React

Import `/register`, render the tag, and set the API from a ref:

```tsx
import '@flowform/devtools-ui/register';
import { useEffect, useRef } from 'react';

const ref = useRef(null);
useEffect(() => ref.current?.setApi(form.devtools), []);

<flowform-devtools-timeline ref={ref} />;
```

## License

MIT
