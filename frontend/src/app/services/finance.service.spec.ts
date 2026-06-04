import { FinanceService } from './finance.service';
import { of } from 'rxjs';

// Mock Angular common modules to prevent Jest from importing ES Modules from node_modules
jest.mock('@angular/common', () => ({
  CommonModule: {},
}));

jest.mock('@angular/common/http', () => ({
  HttpClient: class {},
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
    inject: () => {
      return {
        get: jest.fn().mockReturnValue(of([])),
        post: jest.fn().mockReturnValue(of({})),
        put: jest.fn().mockReturnValue(of({})),
        delete: jest.fn().mockReturnValue(of({})),
      };
    },
  };
});

describe('FinanceService Unit Tests', () => {
  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService();
  });

  it('should initialize with default states and maps', () => {
    /**
     * Test case to verify initial states and color configurations of FinanceService.
     */
    expect(service.globalTransactions()).toEqual([]);
    expect(service.accounts()).toEqual([]);
    expect(service.categories()).toEqual([]);
    expect(service.error()).toBeNull();
    expect(service.iconMap['Utensils']).toBe('ph-fork-knife');
  });

  it('should correctly extract hex code from tailwind classes', () => {
    /**
     * Test case to verify extractHexColor utility translates class name to hex value correctly.
     */
    const hexRed: string = service.extractHexColor('bg-red-100 text-red-600');
    expect(hexRed).toBe('#dc2626');

    const hexDefault: string = service.extractHexColor('invalid-class');
    expect(hexDefault).toBe('#cbd5e1');
  });
});
