import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;

  // Use signals to manage authentication state reactively
  private sessionState = signal<Session | null>(null);

  currentUser = computed(() => this.sessionState()?.user ?? null);
  isAuthenticated = computed(() => !!this.sessionState());

  constructor() {
    // Replace with your actual Supabase project credentials
    const supabaseUrl = 'https://aoszuzhweogqpfveitji.supabase.co';
    const supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc3p1emh3ZW9ncXBmdmVpdGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDkyODEsImV4cCI6MjA5NTEyNTI4MX0.vLYvdsGaFZ-3aKtFRcLL3St6YeohfMUHWQJj7bgdhhs';

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch initial session asynchronously
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.sessionState.set(session);
    });

    // Listen to authentication state updates (sign-in, sign-out, session refreshes)
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionState.set(session);
    });
  }

  /**
   * Triggers a Magic Link email authentication flow.
   * Supabase sends a login link to the user's email address.
   */
  async signInWithOtp(email: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
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
}
