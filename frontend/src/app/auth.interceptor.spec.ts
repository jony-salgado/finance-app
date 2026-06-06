jest.mock('@angular/router', () => ({
  Router: class {},
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({}),
}));

import { authInterceptor } from './auth.interceptor';
import { of } from 'rxjs';

let mockToken: string | null = 'test-token';
const mockAuthService = {
  token: () => mockToken,
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
    Injectable: () => (target: any) => target,
    signal: mockSignal,
    computed: (fn: any) => {
      return () => fn();
    },
    inject: (token: any) => {
      if (token && token.name === 'AuthService') {
        return mockAuthService;
      }
      return null;
    },
  };
});

describe('authInterceptor Unit Tests', () => {
  it('should add Authorization header if token is present', (done) => {
    const mockRequest = {
      clone: jest.fn().mockImplementation((config) => ({
        headers: {
          has: (name: string) => !!config.setHeaders && name in config.setHeaders,
          get: (name: string) => (config.setHeaders ? config.setHeaders[name] : null),
        },
      })),
    } as any;

    const next = (req: any) => {
      expect(req.headers.has('Authorization')).toBe(true);
      expect(req.headers.get('Authorization')).toBe('Bearer test-token');
      return of({});
    };

    mockToken = 'test-token';
    (authInterceptor(mockRequest, next as any) as any).subscribe(() => {
      done();
    });
  });

  it('should not add Authorization header if token is not present', (done) => {
    const mockRequest = {
      clone: jest.fn(),
    } as any;

    const next = (req: any) => {
      expect(req).toBe(mockRequest);
      return of({});
    };

    mockToken = null;
    (authInterceptor(mockRequest, next as any) as any).subscribe(() => {
      done();
    });
  });
});
