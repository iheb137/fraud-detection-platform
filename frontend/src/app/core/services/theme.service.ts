import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _isDark = new BehaviorSubject<boolean>(localStorage.getItem('theme') === 'dark');
  isDark$ = this._isDark.asObservable();

  get isDark(): boolean { return this._isDark.value; }

  toggle(): void {
    this._isDark.next(!this._isDark.value);
    localStorage.setItem('theme', this._isDark.value ? 'dark' : 'light');
    this.apply();
  }

  apply(): void {
    if (this._isDark.value) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  init(): void { this.apply(); }
}