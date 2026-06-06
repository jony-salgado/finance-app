import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  private authSubscription?: any;

  ngOnInit() {
    this.authSubscription = this.authService.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.data.subscription.unsubscribe();
    }
  }

  readonly environment = environment;

  email = signal('');
  pastedUrl = signal('');
  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  /**
   * Parses the access_token and refresh_token from the pasted URL or string.
   */
  private parseTokens(pastedText: string): {
    accessToken: string | null;
    refreshToken: string | null;
  } {
    let cleanText = pastedText.trim();
    try {
      if (!cleanText.startsWith('http://') && !cleanText.startsWith('https://')) {
        cleanText =
          'http://localhost/' +
          (cleanText.startsWith('#') || cleanText.startsWith('?') ? cleanText : '#' + cleanText);
      }
      const urlObj = new URL(cleanText);

      // Try parsing from hash fragment (standard Supabase redirect format)
      const hashQuery = urlObj.hash.startsWith('#') ? urlObj.hash.substring(1) : urlObj.hash;
      let params = new URLSearchParams(hashQuery);
      let accessToken = params.get('access_token');
      let refreshToken = params.get('refresh_token');

      // Fallback: Try parsing from query search parameters
      if (!accessToken || !refreshToken) {
        params = new URLSearchParams(urlObj.search);
        accessToken = accessToken || params.get('access_token');
        refreshToken = refreshToken || params.get('refresh_token');
      }

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
    } catch (e) {
      // Ignore URL parsing errors and try regex fallback
    }

    const accessMatch = cleanText.match(/access_token=([^&]+)/);
    const refreshMatch = cleanText.match(/refresh_token=([^&]+)/);
    return {
      accessToken: accessMatch ? accessMatch[1] : null,
      refreshToken: refreshMatch ? refreshMatch[1] : null,
    };
  }

  async onInjectToken() {
    const text = this.pastedUrl().trim();
    if (!text) {
      this.errorMessage.set('Please paste a valid Supabase Redirect URL or token string.');
      return;
    }

    const { accessToken, refreshToken } = this.parseTokens(text);

    if (!accessToken || !refreshToken) {
      this.errorMessage.set(
        'Could not extract access_token and refresh_token from the provided text.',
      );
      return;
    }

    this.loading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    try {
      await this.authService.setSession(accessToken, refreshToken);
      this.successMessage.set('Session injected successfully! Redirecting...');
      this.pastedUrl.set('');
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      this.errorMessage.set(
        err.message || 'Failed to manually set session. Please check your tokens.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async onBypassLogin() {
    this.loading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    try {
      this.authService.bypassLogin();
      this.successMessage.set('Bypassed login successfully! Redirecting...');
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      this.errorMessage.set(err.message || 'Failed to bypass login.');
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit() {
    if (!this.email()) return;

    this.loading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    try {
      await this.authService.signInWithOtp(this.email());
      this.successMessage.set(
        'Magic Link sent! Please check your inbox for instructions to sign in.',
      );
    } catch (err: any) {
      console.error(err);
      this.errorMessage.set(err.message || 'Failed to send Magic Link. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
