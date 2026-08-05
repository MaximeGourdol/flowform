import {
  Directive,
  effect,
  ElementRef,
  HostListener,
  Input,
  inject,
} from '@angular/core';
import { FlowFormService } from './flow-form.service';

@Directive({
  selector: '[flowField]',
  standalone: true,
})
export class FlowFieldDirective {
  private readonly form = inject(FlowFormService);
  private readonly el =
    inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  @Input({ required: true, alias: 'flowField' }) path!: string;

  constructor() {
    effect(() => {
      const value: unknown = this.form.value(this.path)();
      if (this.el.type === 'checkbox') {
        this.el.checked = Boolean(value);
      } else {
        const next =
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
            ? String(value)
            : '';
        if (this.el.value !== next) {
          this.el.value = next;
        }
      }
    });
  }

  @HostListener('input')
  onInput(): void {
    const next = this.el.type === 'checkbox' ? this.el.checked : this.el.value;
    this.form.setValue(this.path, next);
    void this.form.revalidateField(this.path, 'change');
  }

  @HostListener('blur')
  onBlur(): void {
    this.form.markTouched(this.path);
    void this.form.revalidateField(this.path, 'blur');
  }
}
