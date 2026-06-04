import { OpenFinanceButtonComponent } from './open-finance-button.component';

jest.mock('@angular/common', () => ({
  CommonModule: {},
}));

jest.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

// Mock service state
const mockFinanceService = {
  getOpenFinanceLinkToken: jest.fn().mockResolvedValue({ linkToken: 'token-abc' }),
  syncPluggyAccount: jest.fn().mockResolvedValue({ is_new: true, transactions_added: 5 }),
  loadData: jest.fn(),
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
    signal: mockSignal,
    inject: () => mockFinanceService,
  };
});

describe('OpenFinanceButtonComponent Unit Tests', () => {
  let component: OpenFinanceButtonComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    component = new OpenFinanceButtonComponent();
  });

  it('should initialize with loading set to false', () => {
    /**
     * Test case to verify the initial loading signal is false.
     */
    expect(component.loading()).toBe(false);
  });

  it('should call getOpenFinanceLinkToken and open Pluggy Connect on connectAccount', async () => {
    /**
     * Test case to verify connection flow is initiated and calls FinanceService.
     */
    const mockPluggyConnect = jest.fn().mockImplementation(() => ({
      init: jest.fn(),
    }));
    (global as any).PluggyConnect = mockPluggyConnect;
    (global as any).window = { PluggyConnect: mockPluggyConnect } as any;

    await component.connectAccount();

    expect(mockFinanceService.getOpenFinanceLinkToken).toHaveBeenCalled();
    expect(mockPluggyConnect).toHaveBeenCalled();
    expect(component.loading()).toBe(true);
  });
});
