import { PrivacyService } from './privacy.service';

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
  };
});

describe('PrivacyService Unit Tests', () => {
  let service: PrivacyService;

  beforeEach(() => {
    const store: Record<string, string> = {};
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
      },
      writable: true,
    });
    service = new PrivacyService();
  });

  it('should initialize with false privacy mode', () => {
    expect(service.isPrivateMode()).toBe(false);
  });

  it('should toggle privacy mode and save to localStorage', () => {
    service.togglePrivacyMode();
    expect(service.isPrivateMode()).toBe(true);
    expect(localStorage.getItem('finance_app_privacy_mode')).toBe('true');

    service.togglePrivacyMode();
    expect(service.isPrivateMode()).toBe(false);
    expect(localStorage.getItem('finance_app_privacy_mode')).toBe('false');
  });
});
