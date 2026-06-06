import { PrivacyButtonComponent } from './privacy-button.component';

const mockPrivacyService = {
  togglePrivacyMode: jest.fn(),
  isPrivateMode: jest.fn().mockReturnValue(false),
};

jest.mock('@angular/common', () => ({
  CommonModule: {},
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
    Component: () => (target: any) => target,
    Injectable: () => (target: any) => target,
    ChangeDetectionStrategy: { OnPush: 0 },
    signal: mockSignal,
    inject: (token: any) => {
      if (token && token.name === 'PrivacyService') return mockPrivacyService;
      return null;
    },
  };
});

describe('PrivacyButtonComponent Unit Tests', () => {
  let component: PrivacyButtonComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    component = new PrivacyButtonComponent();
  });

  it('should create and inject PrivacyService', () => {
    expect(component).toBeTruthy();
    expect(component.privacyService).toBe(mockPrivacyService);
  });
});
