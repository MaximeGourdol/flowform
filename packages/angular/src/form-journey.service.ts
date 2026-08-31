import type {
  FormCore,
  FormState,
  Path,
  PathValue,
  TriggerTarget,
} from '@formjourney/core';
import {
  computed,
  Injectable,
  Inject,
  Optional,
  signal,
  type Signal,
  type WritableSignal,
  OnDestroy,
} from '@angular/core';
import {
  FORM_JOURNEY,
  FORM_JOURNEY_MODE,
  type FieldTrigger,
  type FormJourneyMode,
} from './tokens';

const DEFAULT_MODE: FormJourneyMode = {
  mode: 'onSubmit',
  reValidateMode: 'onChange',
};

@Injectable()
export class FormJourneyService<TValues = unknown> implements OnDestroy {
  readonly core: FormCore<TValues>;

  private readonly mode: FormJourneyMode;
  private readonly stateSignal: WritableSignal<FormState<TValues>>;
  private readonly offHandlers: (() => void)[] = [];

  constructor(
    @Inject(FORM_JOURNEY) core: FormCore<TValues>,
    @Optional() @Inject(FORM_JOURNEY_MODE) mode: FormJourneyMode | null = null,
  ) {
    this.core = core;
    this.mode = mode ?? DEFAULT_MODE;
    this.stateSignal = signal(core.store.getState());

    const refresh = (): void => {
      this.stateSignal.set(core.store.getState());
    };

    this.offHandlers.push(
      core.store.subscribeAll(refresh),
      core.bus.on('step:change', refresh),
      core.bus.on('validate:end', refresh),
      core.bus.on('submit:start', refresh),
      core.bus.on('submit:end', refresh),
    );
  }

  readonly state: Signal<FormState<TValues>> = computed(() =>
    this.stateSignal(),
  );

  readonly values: Signal<TValues> = computed(() => this.stateSignal().values);
  readonly isValid: Signal<boolean> = computed(
    () => this.stateSignal().isValid,
  );
  readonly isDirty: Signal<boolean> = computed(
    () => this.stateSignal().isDirty,
  );
  readonly isSubmitting: Signal<boolean> = computed(
    () => this.stateSignal().isSubmitting,
  );
  readonly submitCount: Signal<number> = computed(
    () => this.stateSignal().submitCount,
  );

  readonly currentStep: Signal<string | null> = computed(() => {
    this.stateSignal();
    return this.core.steps.currentStep();
  });

  readonly activeSteps: Signal<readonly string[]> = computed(() => {
    this.stateSignal();
    return this.core.steps.activeStepIds();
  });

  value<P extends Path<TValues>>(
    path: P,
  ): Signal<PathValue<TValues, P & string>> {
    return computed(() => {
      this.stateSignal();
      return this.core.store.getValue(path);
    });
  }

  error(path: Path<TValues>): Signal<string | undefined> {
    return computed(() => this.stateSignal().errors[path]?.[0]);
  }

  touched(path: Path<TValues>): Signal<boolean> {
    return computed(() => this.stateSignal().touched[path] === true);
  }

  setValue<P extends Path<TValues>>(
    path: P,
    value: PathValue<TValues, P & string>,
  ): void {
    this.core.store.setValue(path, value);
    this.core.bus.emit('field:change', { path, value });
    this.stateSignal.set(this.core.store.getState());
  }

  markTouched(path: Path<TValues>): void {
    this.core.store.setTouched(path, true);
    this.stateSignal.set(this.core.store.getState());
  }

  async revalidateField(
    path: Path<TValues>,
    trigger: FieldTrigger,
  ): Promise<void> {
    const inError = (this.core.store.getState().errors[path] ?? []).length > 0;
    const active = inError ? this.mode.reValidateMode : this.mode.mode;
    const matches =
      (active === 'onChange' && trigger === 'change') ||
      (active === 'onBlur' && trigger === 'blur');
    if (!matches) {
      return;
    }
    const before = this.core.store.getState().errors;
    await this.core.steps.trigger('current');
    const messages = this.core.store.getState().errors[path];
    const next: Record<string, readonly string[]> = {};
    for (const [key, value] of Object.entries(before)) {
      if (key !== path) {
        next[key] = value;
      }
    }
    if (messages !== undefined && messages.length > 0) {
      next[path] = messages;
    }
    this.core.store.setErrors(next);
    this.stateSignal.set(this.core.store.getState());
  }

  async trigger(target?: TriggerTarget<TValues>): Promise<boolean> {
    const ok = await this.core.steps.trigger(target);
    this.stateSignal.set(this.core.store.getState());
    return ok;
  }

  resetField(path: Path<TValues>): void {
    this.core.store.resetField(path);
    this.stateSignal.set(this.core.store.getState());
  }

  reset(partial?: Partial<TValues>): void {
    this.core.store.reset(partial);
    this.stateSignal.set(this.core.store.getState());
  }

  async next(): Promise<boolean> {
    const ok = await this.core.steps.trigger('current');
    this.stateSignal.set(this.core.store.getState());
    if (!ok) {
      return false;
    }
    const moved = await this.core.steps.goNextActive();
    this.stateSignal.set(this.core.store.getState());
    return moved;
  }

  prev(): void {
    this.core.store.clearErrors();
    this.core.steps.goPrevActive();
    this.stateSignal.set(this.core.store.getState());
  }

  goTo(id: string): boolean {
    const moved = this.core.steps.goTo(id);
    this.stateSignal.set(this.core.store.getState());
    return moved;
  }

  items(path: Path<TValues>): Signal<readonly unknown[]> {
    return computed((): readonly unknown[] => {
      this.stateSignal();
      const value: unknown = this.core.store.getValue(path);
      return Array.isArray(value) ? (value as readonly unknown[]) : [];
    });
  }

  append(path: Path<TValues>, value: unknown): void {
    this.core.store.arrayAppend(path, value);
    this.stateSignal.set(this.core.store.getState());
  }

  removeAt(path: Path<TValues>, index: number): void {
    this.core.store.arrayRemove(path, index);
    this.stateSignal.set(this.core.store.getState());
  }

  moveItem(path: Path<TValues>, from: number, to: number): void {
    this.core.store.arrayMove(path, from, to);
    this.stateSignal.set(this.core.store.getState());
  }

  async submit(
    onValid?: (values: TValues) => void | Promise<void>,
  ): Promise<boolean> {
    const result = await this.core.submit(onValid);
    this.stateSignal.set(this.core.store.getState());
    return result.ok;
  }

  ngOnDestroy(): void {
    for (const off of this.offHandlers) {
      off();
    }
  }
}
