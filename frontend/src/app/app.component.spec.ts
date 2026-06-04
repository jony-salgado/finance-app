import { AppComponent } from './app.component';

jest.mock('@angular/common', () => ({
  CommonModule: {},
}));

jest.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

// Mock child components to prevent Jest from loading their real ESM files and templates
jest.mock('./components/card-resumo/card-resumo.component', () => ({
  CardResumoComponent: class {},
}));

jest.mock('./components/card-pizza/card-pizza.component', () => ({
  CardPizzaComponent: class {},
}));

jest.mock('./components/open-finance-button/open-finance-button.component', () => ({
  OpenFinanceButtonComponent: class {},
}));

// Mock service state
const mockFinanceService = {
  iconMap: { Utensils: 'ph-fork-knife' },
  globalTransactions: () => [
    {
      id: '1',
      description: 'Mercado',
      amount: 100.0,
      type: 'expense',
      date: '2026-06-02',
      category: 'cat-1',
      account: 'acc-1',
    },
    {
      id: '2',
      description: 'Salário',
      amount: 3000.0,
      type: 'income',
      date: '2026-06-01',
      category: 'cat-2',
      account: 'acc-1',
    },
  ],
  categories: () => [
    {
      id: 'cat-1',
      name: 'Alimentação',
      color: 'text-red-600',
      cardColor: '#ff0000',
      iconClass: 'ph-fork-knife',
    },
    {
      id: 'cat-2',
      name: 'Salário',
      color: 'text-green-600',
      cardColor: '#00ff00',
      iconClass: 'ph-bank',
    },
  ],
  accounts: () => [
    { id: 'acc-1', name: 'Banco do Brasil', type: 'checking', initialBalance: 1000.0 },
  ],
  error: () => null,
  extractHexColor: () => '#ffffff',
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
    computed: (fn: any) => {
      return () => fn();
    },
    inject: () => mockFinanceService,
  };
});

describe('AppComponent Unit Tests', () => {
  let component: AppComponent;

  beforeEach(() => {
    component = new AppComponent();
  });

  it('should compute dash balances correctly based on transactions', () => {
    /**
     * Test case to verify account balances and incomes/expenses calculations in computed signals.
     */
    const dashboard = component.dash();
    // initialBalance (1000) + income (3000) - expense (100) = 3900
    expect(dashboard.accountBalance).toBe(3900.0);
    expect(dashboard.monthIncomes).toBe(3000.0);
    expect(dashboard.monthExpenses).toBe(100.0);
  });

  it('should map monthTransactions correctly for active month', () => {
    /**
     * Test case to verify transaction lists are correctly filtered for the active month (2026-06).
     */
    component.currentMonthYear.set('2026-06');
    const txns = component.monthTransactions();
    expect(txns.length).toBe(2);
    expect(txns[0].description).toBe('Mercado');
  });
});
