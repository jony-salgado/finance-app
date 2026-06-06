import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PrivacyService {
  private readonly STORAGE_KEY = 'finance_app_privacy_mode';

  // Writable signal indicating if private mode (value blurring) is enabled
  isPrivateMode = signal<boolean>(this.loadInitialState());

  /**
   * Toggles the privacy mode and persists the new state in localStorage.
   */
  togglePrivacyMode(): void {
    const newState = !this.isPrivateMode();
    this.isPrivateMode.set(newState);
    localStorage.setItem(this.STORAGE_KEY, String(newState));
  }

  private loadInitialState(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    const val = localStorage.getItem(this.STORAGE_KEY);
    return val === 'true';
  }
}
