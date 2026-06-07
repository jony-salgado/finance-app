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
  showManualLogin = signal(false);

  private logoClickCount = 0;

  onLogoClick() {
    this.logoClickCount++;
    if (this.logoClickCount >= 5) {
      this.showManualLogin.set(true);
    }
  }

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

  private parseOtp(pastedText: string): {
    token: string | null;
    type: string | null;
  } {
    let cleanText = pastedText.trim();
    try {
      if (!cleanText.startsWith('http://') && !cleanText.startsWith('https://')) {
        cleanText = 'http://localhost/' + (cleanText.startsWith('?') ? cleanText : '?' + cleanText);
      }
      const urlObj = new URL(cleanText);
      const params = new URLSearchParams(urlObj.search);
      const token = params.get('token');
      const type = params.get('type');
      if (token && type) {
        return { token, type };
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    const tokenMatch = cleanText.match(/token=([^&]+)/);
    const typeMatch = cleanText.match(/type=([^&]+)/);
    return {
      token: tokenMatch ? tokenMatch[1] : null,
      type: typeMatch ? typeMatch[1] : null,
    };
  }

  async onInjectToken() {
    const text = this.pastedUrl().trim();
    if (!text) {
      this.errorMessage.set('Por favor, cole um link ou token válido.');
      return;
    }

    const otp = this.parseOtp(text);

    this.loading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    try {
      if (otp.token && otp.type) {
        // Case 1: Verification link from email (OTP token + type)
        if (!this.email()) {
          this.errorMessage.set(
            'Por favor, preencha o campo de e-mail antes de entrar com o link.',
          );
          this.loading.set(false);
          return;
        }
        await this.authService.verifyOtp(this.email().trim(), otp.token, otp.type);
        this.successMessage.set('Sessão verificada com sucesso! Redirecionando...');
      } else {
        // Case 2: Redirect URL containing access_token & refresh_token
        const { accessToken, refreshToken } = this.parseTokens(text);
        if (!accessToken || !refreshToken) {
          this.errorMessage.set(
            'Não foi possível extrair os tokens de acesso ou verificação do texto fornecido.',
          );
          this.loading.set(false);
          return;
        }
        await this.authService.setSession(accessToken, refreshToken);
        this.successMessage.set('Sessão iniciada com sucesso! Redirecionando...');
      }

      this.pastedUrl.set('');
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      this.errorMessage.set(
        err.message || 'Falha ao autenticar. Por favor, verifique o link fornecido.',
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
