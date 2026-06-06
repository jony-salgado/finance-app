jest.mock('@angular/router', () => ({
  Router: class {},
}));

let mockIsAuthenticated = true;
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
    Injectable: () => (target: any) => target,
    signal: mockSignal,
    computed: (fn: any) => {
      return () => fn();
    },
    inject: (token: any) => {
      if (token && token.name === 'AuthService') {
        return {
          initialized: Promise.resolve(),
          isAuthenticated: () => mockIsAuthenticated,
        };
      }
      if (token && token.name === 'Router') {
        return mockRouter;
      }
      return null;
    },
  };
});

import { authGuard } from './auth.guard';

describe('authGuard Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true if user is authenticated', async () => {
    mockIsAuthenticated = true;
    const result = await (authGuard as any)();
    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to /login and return false if user is not authenticated', async () => {
    mockIsAuthenticated = false;
    const result = await (authGuard as any)();
    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], { preserveFragment: true });
  });
});
