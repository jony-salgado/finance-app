jest.mock('@angular/common', () => ({
  CommonModule: {},
}));

jest.mock('@angular/forms', () => ({
  FormsModule: {},
}));

jest.mock('@angular/router', () => ({
  Router: class {},
}));

const mockAuthService = {
  signInWithOtp: jest.fn(),
  setSession: jest.fn(),
  bypassLogin: jest.fn(),
  onAuthStateChange: jest.fn().mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  }),
};

const mockRouter = {
  navigate: jest.fn(),
};

jest.mock('@angular/core', () => {
  const mockSignal = <T>(initialValue: T): any => {
    let val: T = initialValue;
    const s: any = () => val;
    s.set = (newVal: T) => {
      val = newVal;
    };
    s.update = (fn: (v: T) => T) => {
      val = fn(val);
    };
    return s;
  };

  return {
    Component: () => (target: any) => target,
    Injectable: () => (target: any) => target,
    ChangeDetectionStrategy: { OnPush: 0 },
    signal: mockSignal,
    isDevMode: () => true,
    inject: (token: any) => {
      if (token && token.name === 'AuthService') return mockAuthService;
      if (token && token.name === 'Router') return mockRouter;
      return null;
    },
  };
});

import { LoginComponent } from './login.component';

describe('LoginComponent Unit Tests', () => {
  let component: LoginComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    component = new LoginComponent();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty email and loading false', () => {
    expect(component).toBeTruthy();
    expect(component.email()).toBe('');
    expect(component.pastedUrl()).toBe('');
    expect(component.loading()).toBe(false);
    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).toBeNull();
  });

  it('should call authService.signInWithOtp and set success message on success', async () => {
    mockAuthService.signInWithOtp.mockResolvedValue(undefined);
    component.email.set('user@example.com');
    await component.onSubmit();

    expect(mockAuthService.signInWithOtp).toHaveBeenCalledWith('user@example.com');
    expect(component.successMessage()).toBe(
      'Magic Link sent! Please check your inbox for instructions to sign in.',
    );
    expect(component.errorMessage()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('should set error message on failure', async () => {
    mockAuthService.signInWithOtp.mockRejectedValue(new Error('Auth failed'));
    component.email.set('user@example.com');
    await component.onSubmit();

    expect(mockAuthService.signInWithOtp).toHaveBeenCalledWith('user@example.com');
    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).toBe('Auth failed');
    expect(component.loading()).toBe(false);
  });

  it('should not call authService.signInWithOtp if email is empty', async () => {
    await component.onSubmit();
    expect(mockAuthService.signInWithOtp).not.toHaveBeenCalled();
  });

  it('should set error message if pastedUrl is empty on token injection', async () => {
    component.pastedUrl.set('');
    await component.onInjectToken();
    expect(component.errorMessage()).toBe(
      'Please paste a valid Supabase Redirect URL or token string.',
    );
    expect(mockAuthService.setSession).not.toHaveBeenCalled();
  });

  it('should set error message if access_token or refresh_token is missing', async () => {
    component.pastedUrl.set('http://localhost:4200/#access_token=123');
    await component.onInjectToken();
    expect(component.errorMessage()).toBe(
      'Could not extract access_token and refresh_token from the provided text.',
    );
    expect(mockAuthService.setSession).not.toHaveBeenCalled();
  });

  it('should extract tokens and call setSession successfully', async () => {
    mockAuthService.setSession.mockResolvedValue(undefined);
    component.pastedUrl.set('http://localhost:4200/#access_token=abc&refresh_token=xyz');
    await component.onInjectToken();

    expect(mockAuthService.setSession).toHaveBeenCalledWith('abc', 'xyz');
    expect(component.successMessage()).toBe('Session injected successfully! Redirecting...');
    expect(component.errorMessage()).toBeNull();

    // Trigger fake timers to check navigation
    jest.runAllTimers();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should handle setSession failure', async () => {
    mockAuthService.setSession.mockRejectedValue(new Error('Invalid token'));
    component.pastedUrl.set('access_token=abc&refresh_token=xyz');
    await component.onInjectToken();

    expect(mockAuthService.setSession).toHaveBeenCalledWith('abc', 'xyz');
    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).toBe('Invalid token');
    expect(component.loading()).toBe(false);
  });

  it('should call authService.bypassLogin successfully and redirect to dashboard', async () => {
    mockAuthService.bypassLogin.mockImplementation(() => {});
    await component.onBypassLogin();

    expect(mockAuthService.bypassLogin).toHaveBeenCalled();
    expect(component.successMessage()).toBe('Bypassed login successfully! Redirecting...');
    expect(component.errorMessage()).toBeNull();

    // Trigger fake timers to check navigation
    jest.runAllTimers();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should handle bypassLogin failure', async () => {
    mockAuthService.bypassLogin.mockImplementation(() => {
      throw new Error('Bypass failed');
    });
    await component.onBypassLogin();

    expect(mockAuthService.bypassLogin).toHaveBeenCalled();
    expect(component.successMessage()).toBeNull();
    expect(component.errorMessage()).toBe('Bypass failed');
    expect(component.loading()).toBe(false);
  });

  it('should register onAuthStateChange on ngOnInit and redirect on SIGNED_IN', () => {
    let capturedCallback: any;
    mockAuthService.onAuthStateChange.mockImplementation((cb: any) => {
      capturedCallback = cb;
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    });

    component.ngOnInit();

    expect(mockAuthService.onAuthStateChange).toHaveBeenCalled();
    expect(capturedCallback).toBeDefined();

    capturedCallback('SIGNED_IN', null);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should unsubscribe from auth state changes on ngOnDestroy', () => {
    const mockUnsubscribe = jest.fn();
    mockAuthService.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    });

    component.ngOnInit();
    component.ngOnDestroy();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
