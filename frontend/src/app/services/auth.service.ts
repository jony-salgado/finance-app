import { Injectable, signal, computed, inject } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;

  // Promise that resolves once the initial authentication check completes
  initialized: Promise<any>;

  // Use signals to manage authentication state reactively, initializing from a dev mock session if present
  private sessionState = signal<Session | null>(this.loadMockSession());

  currentUser = computed(() => this.sessionState()?.user ?? null);
  isAuthenticated = computed(() => !!this.sessionState());
  token = computed(() => this.sessionState()?.access_token ?? null);

  constructor() {
    const router = inject(Router);

    // Replace with your actual Supabase project credentials
    const supabaseUrl = 'https://aoszuzhweogqpfveitji.supabase.co';
    const supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc3p1emh3ZW9ncXBmdmVpdGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDkyODEsImV4cCI6MjA5NTEyNTI4MX0.vLYvdsGaFZ-3aKtFRcLL3St6YeohfMUHWQJj7bgdhhs';

    // Safari iOS ITP & persistent session optimization: autoRefreshToken, persistSession, detectSessionInUrl explicit
    const supabaseOptions = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    };

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

    this.initialized = this.initializeSession();

    // Listen to authentication state updates (sign-in, sign-out, session refreshes)
    this.supabase.auth.onAuthStateChange((event, session) => {
      // Only overwrite if we don't have an active dev mock session
      if (
        typeof localStorage !== 'undefined' &&
        !localStorage.getItem('finance_app_mock_session')
      ) {
        this.sessionState.set(session);
      }

      if (event === 'SIGNED_IN') {
        router.navigate(['/dashboard']);
      }
    });
  }

  private async initializeSession(): Promise<void> {
    // 1. If we have a dev mock session already active, resolve immediately
    if (this.sessionState()) {
      return;
    }

    // 2. iOS/Safari compatibility helper: Parse URL hash & query params before Angular routing alters them
    const tokens = this.extractTokensFromUrl();
    if (tokens.accessToken && tokens.refreshToken) {
      try {
        console.log('Safari iOS Helper: Found tokens in URL, setting session manually...');
        const {
          data: { session },
          error,
        } = await this.supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        if (error) throw error;

        if (session) {
          this.sessionState.set(session);
          return;
        }
      } catch (err) {
        console.error('Safari iOS Helper: Failed to manually set session from URL', err);
      }
    }

    // 3. Fallback: Fetch initial session asynchronously from Supabase SDK
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (!this.sessionState() && session) {
        this.sessionState.set(session);
      }
    } catch (err) {
      console.error('Error fetching initial session:', err);
    }
  }

  private extractTokensFromUrl(): { accessToken: string | null; refreshToken: string | null } {
    if (typeof window === 'undefined') {
      return { accessToken: null, refreshToken: null };
    }

    const href = window.location.href;
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    try {
      // Parse hash fragment natively
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
      }

      // Parse query params if not found in hash
      if (!accessToken || !refreshToken) {
        const urlObj = new URL(href);
        accessToken = urlObj.searchParams.get('access_token');
        refreshToken = urlObj.searchParams.get('refresh_token');
      }
    } catch (e) {
      console.error('Error parsing tokens from URL:', e);
    }

    return { accessToken, refreshToken };
  }

  private loadMockSession(): Session | null {
    if (typeof localStorage !== 'undefined') {
      const savedMock = localStorage.getItem('finance_app_mock_session');
      if (savedMock) {
        try {
          return JSON.parse(savedMock);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Bypasses authentication in development mode by setting a mock session.
   */
  bypassLogin(): void {
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'mock-user-uuid-1234',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'jony.salgado@example.com',
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: 'email' },
        user_metadata: {},
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    this.sessionState.set(mockSession as any);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('finance_app_mock_session', JSON.stringify(mockSession));
    }
  }

  /**
   * Triggers a Magic Link email authentication flow.
   * Supabase sends a login link to the user's email address.
   */
  async signInWithOtp(email: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: environment.redirectUrl,
      },
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Log out the currently authenticated user.
   */
  async signOut(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('finance_app_mock_session');
    }
    this.sessionState.set(null);
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  /**
   * Manually sets the session using an access token and refresh token.
   */
  async setSession(accessToken: string, refreshToken: string): Promise<void> {
    const { error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Verifies an OTP token hash (like from a verification email link) and establishes a session.
   */
  async verifyOtp(tokenHash: string, type: any): Promise<void> {
    const { data, error } = await this.supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type,
    });

    if (error) {
      throw error;
    }

    if (data && data.session) {
      this.sessionState.set(data.session);
    }
  }

  /**
   * Listen to authentication state changes.
   */
  onAuthStateChange(callback: (event: any, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}
