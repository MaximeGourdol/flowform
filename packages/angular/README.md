# @formjourney/angular

Angular bindings for [`@formjourney/core`](../core). A DI provider puts a form in
the injector; a service exposes it as signals, and a `[journeyField]` directive
binds inputs. Works zoneless (Angular 17+ signals).

## Install

```bash
pnpm add @formjourney/angular @formjourney/core @angular/core rxjs
```

## Setup

Provide the form where you want it scoped — a component, a route, or the app.

```ts
import { Component } from '@angular/core';
import {
  provideFormJourney,
  injectFormJourney,
  JourneyFieldDirective,
} from '@formjourney/angular';
import { createForm } from '@formjourney/core';

interface Values {
  email: string;
  tags: { name: string }[];
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [JourneyFieldDirective],
  providers: [
    provideFormJourney<Values>(() =>
      createForm<Values>({
        initialValues: { email: '', tags: [] },
        steps: [{ id: 'account' }, { id: 'review' }],
      }),
    ),
  ],
  template: `
    <input type="email" journeyField="account.email" />
    @if (form.error('email')(); as e) {
      <span class="error">{{ e }}</span>
    }
    <button (click)="form.next()">Next</button>
  `,
})
export class SignupComponent {
  readonly form = injectFormJourney<Values>();
}
```

`provideFormJourney` takes either `CreateFormOptions` or a factory returning a
`FormCore` (use the factory when you add plugins), plus optional validation
modes. `injectFormJourney<Values>()` returns the `FormJourneyService` typed to your
values.

```ts
provideFormJourney<Values>(() => createForm(...), {
  mode: 'onSubmit', // when a field is first validated
  reValidateMode: 'onChange', // how an errored field re-validates
});
```

## The `[journeyField]` directive

Binds an `<input>` to a path: it writes on `input`, marks the field touched on
`blur`, and reflects the value back when it changes elsewhere. Checkboxes are
handled by `type`.

```html
<input type="email" journeyField="account.email" />
<input type="checkbox" journeyField="needsShipping" />
```

## The service as signals

Everything reactive is a `Signal`, so templates update without zone.js.

```ts
form.value('account.email'); // Signal<string>
form.error('account.email'); // Signal<string | undefined>
form.touched('account.email'); // Signal<boolean>

form.currentStep(); // Signal<string | null>
form.activeSteps(); // Signal<readonly string[]>

form.isValid();
form.isDirty();
form.isSubmitting();
form.submitCount();
form.state(); // Signal<FormState<Values>> — the whole snapshot
```

Writes and actions are plain methods:

```ts
form.setValue('account.email', 'a@b.co');
form.markTouched('account.email');

await form.next(); // validate the current step, then advance if valid
form.prev();
form.goTo('review');

await form.trigger('all'); // validate on demand, writes errors to the store
form.resetField('account.email');
form.reset();

await form.submit(async (values) => api.signup(values));
```

## Field arrays

```ts
form.items('tags'); // Signal<readonly Tag[]>
form.append('tags', { name: '' });
form.removeAt('tags', 0); // errors on tags.1.* shift down to tags.0.*
form.moveItem('tags', 0, 1);
```

## Conditional steps

Add [`@formjourney/plugin-steps-conditional`](../plugin-steps-conditional) to the
form in the `provideFormJourney` factory. `activeSteps()`, `next()`, and `submit()`
respect the rules automatically — a hidden step never blocks navigation or
submit.

## Validation modes

`provideFormJourney`'s second argument takes `mode` and `reValidateMode`
(`onSubmit` | `onChange` | `onBlur`), matching the React binding.

- `mode` — when a field is first validated, before it has an error.
- `reValidateMode` — how a field re-validates once it already shows an error.

The `[journeyField]` directive drives this on `input` / `blur`. The default,
`mode: 'onSubmit'` with `reValidateMode: 'onChange'`, shows no errors while the
user first types, but once an error appears it clears itself as they fix the
field.

## RxJS

Prefer Observables? Wrap any signal with Angular's `toObservable`:

```ts
import { toObservable } from '@angular/core/rxjs-interop';

const email$ = toObservable(form.value('account.email'));
```

## License

MIT
