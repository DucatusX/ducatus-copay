import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[OnlyNumber]'
})
export class OnlyNumber {

  constructor() { }

  @Input() OnlyNumber: boolean;

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
    let e = event;
    if (this.OnlyNumber) {
      if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A
        (e.key === 'A' && (e.ctrlKey || e.metaKey)) ||
        // Allow: Ctrl+C
        (e.key === 'C' && (e.ctrlKey || e.metaKey)) ||
        // Allow: Ctrl+V
        (e.key === 'V' && (e.ctrlKey || e.metaKey)) ||
        // Allow: Ctrl+X
        (e.key === 'X' && (e.ctrlKey || e.metaKey)) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
          return;
        }
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
      }
  }
}