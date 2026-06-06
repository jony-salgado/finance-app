if (typeof window === 'undefined') {
  (global as any).window = {
    location: {
      origin: 'http://localhost',
    },
  };
}

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: {} } }),
    signInWithOtp: jest.fn(),
    signOut: jest.fn(),
    setSession: jest.fn(),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

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
    Injectable: () => (target: any) => target,
    signal: mockSignal,
    computed: (fn: any) => {
      return () => fn();
    },
  };
});

import { AuthService } from './auth.service';

describe('AuthService Unit Tests', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  it('should initialize with no authentication', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should call signInWithOtp successfully', async () => {
    mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await service.signInWithOtp('test@example.com');
    expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: 'http://localhost',
      },
    });
  });

  it('should throw error if signInWithOtp returns error', async () => {
    mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: new Error('Error sending OTP'),
    });
    await expect(service.signInWithOtp('test@example.com')).rejects.toThrow('Error sending OTP');
  });

  it('should call signOut successfully', async () => {
    mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });
    await service.signOut();
    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
  });

  it('should throw error if signOut returns error', async () => {
    mockSupabaseClient.auth.signOut.mockResolvedValue({
      error: new Error('Error signing out'),
    });
    await expect(service.signOut()).rejects.toThrow('Error signing out');
  });

  it('should call setSession successfully', async () => {
    mockSupabaseClient.auth.setSession.mockResolvedValue({ data: {}, error: null });
    await service.setSession('access', 'refresh');
    expect(mockSupabaseClient.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('should throw error if setSession returns error', async () => {
    mockSupabaseClient.auth.setSession.mockResolvedValue({
      error: new Error('Error setting session'),
    });
    await expect(service.setSession('access', 'refresh')).rejects.toThrow('Error setting session');
  });
});
