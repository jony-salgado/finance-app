jest.mock('@angular/router', () => ({
  Router: class {
    navigate() {}
  },
}));

import { DashboardComponent } from './dashboard.component';

jest.mock('@angular/common', () => ({
  CommonModule: {},
}));

jest.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

// Mock child components to prevent Jest from loading their real ESM files and templates
jest.mock('../../components/card-resumo/card-resumo.component', () => ({
  CardResumoComponent: class {},
}));

jest.mock('../../components/card-pizza/card-pizza.component', () => ({
  CardPizzaComponent: class {},
}));

jest.mock('../../components/open-finance-button/open-finance-button.component', () => ({
  OpenFinanceButtonComponent: class {},
}));

jest.mock('../../components/privacy-button/privacy-button.component', () => ({
  PrivacyButtonComponent: class {},
}));

// Mock service state
const mockFinanceService = {
  iconMap: { Utensils: 'ph-fork-knife' } as any,
  globalTransactions: () => [
    {
      id: '1',
      description: 'Mercado',
      amount: 100.0,
      type: 'expense',
      date: '2026-06-02',
      category: 'cat-1',
      account: 'acc-1',
    } as any,
    {
      id: '2',
      description: 'Salário',
      amount: 3000.0,
      type: 'income',
      date: '2026-06-01',
      category: 'cat-2',
      account: 'acc-1',
    } as any,
  ],
  categories: () => [
    {
      id: 'cat-1',
      name: 'Alimentação',
      color: 'text-red-600',
      cardColor: '#ff0000',
      iconClass: 'ph-fork-knife',
    } as any,
    {
      id: 'cat-2',
      name: 'Salário',
      color: 'text-green-600',
      cardColor: '#00ff00',
      iconClass: 'ph-bank',
    } as any,
  ],
  accounts: () => [
    { id: 'acc-1', name: 'Banco do Brasil', type: 'checking', initialBalance: 1000.0 } as any,
  ],
  error: () => null,
  extractHexColor: () => '#ffffff',
  loadData: () => {},
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
    inject: (token: any) => {
      if (token && token.name === 'FinanceService') return mockFinanceService;
      if (token && token.name === 'AuthService') {
        return {
          isAuthenticated: () => true,
          signOut: () => Promise.resolve(),
        };
      }
      if (token && token.name === 'Router') {
        return {
          navigate: () => {},
        };
      }
      return mockFinanceService;
    },
  };
});

describe('DashboardComponent Unit Tests', () => {
  let component: DashboardComponent;

  beforeEach(() => {
    component = new DashboardComponent();
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
    expect(dashboard.expensesByGroup).toBeDefined();
    expect(dashboard.expensesByGroup.length).toBe(1);
    expect(dashboard.expensesByGroup[0].id).toBe('weekly');
    expect(dashboard.expensesByGroup[0].amount).toBe(100.0);
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

  it('should toggle selectedCardIdForTransactions correctly', () => {
    expect(component.selectedCardIdForTransactions()).toBeNull();
    component.toggleCardTransactions('card-1');
    expect(component.selectedCardIdForTransactions()).toBe('card-1');
    component.toggleCardTransactions('card-1');
    expect(component.selectedCardIdForTransactions()).toBeNull();
  });

  it('should compute selectedCardTransactions correctly in the billing period', () => {
    const originalGlobalTransactions = mockFinanceService.globalTransactions;
    const originalAccounts = mockFinanceService.accounts;
    const originalCategories = mockFinanceService.categories;
    const originalIconMap = mockFinanceService.iconMap;

    mockFinanceService.iconMap = {
      utensils: 'ph-fork-knife',
      transfer: 'ph-arrows-left-right',
    } as any;
    mockFinanceService.accounts = () => [
      { id: 'acc-1', name: 'Banco do Brasil', type: 'checking', initialBalance: 1000.0 } as any,
      {
        id: 'card-1',
        name: 'Nubank',
        type: 'credit_card',
        closingDay: 5,
        dueDay: 15,
        cardLastDigits: '9999',
      } as any,
    ];
    mockFinanceService.categories = () => [
      {
        id: 'cat-1',
        name: 'Alimentação',
        color: 'text-red-600',
        cardColor: '#ff0000',
        iconName: 'utensils',
      } as any,
    ];
    mockFinanceService.globalTransactions = () => [
      {
        id: '1',
        description: 'Mercado',
        amount: 100.0,
        type: 'expense',
        date: '2026-06-02',
        category: 'cat-1',
        account: 'acc-1',
      } as any,
      {
        id: '2',
        description: 'Salário',
        amount: 3000.0,
        type: 'income',
        date: '2026-06-01',
        category: 'cat-2',
        account: 'acc-1',
      } as any,
      {
        id: '3',
        description: 'Card Purchase',
        amount: 50.0,
        type: 'expense',
        date: '2026-06-02',
        category: 'cat-1',
        account: 'card-1',
      } as any,
      {
        id: '4',
        description: 'Bill Payment',
        amount: 150.0,
        type: 'credit_card_payment',
        date: '2026-06-01',
        sourceAccount: 'acc-1',
        destinationAccount: 'card-1',
        referenceMonth: '2026-06',
      } as any,
      {
        id: '5',
        description: 'Card Refund',
        amount: 30.0,
        type: 'income',
        date: '2026-06-03',
        account: 'acc-1',
        tags: ['estorno', 'estorno_card:card-1'],
      } as any,
      {
        id: '6',
        description: 'Next Bill Purchase',
        amount: 80.0,
        type: 'expense',
        date: '2026-06-07',
        category: 'cat-1',
        account: 'card-1',
      } as any,
    ];

    const testComponent = new DashboardComponent();
    testComponent.currentMonthYear.set('2026-06');
    testComponent.selectedCardIdForTransactions.set('card-1');

    const txns = testComponent.selectedCardTransactions();

    expect(txns.length).toBe(3);

    const purchase = txns.find((t) => t.id === '3');
    const payment = txns.find((t) => t.id === '4');
    const refund = txns.find((t) => t.id === '5');

    expect(purchase).toBeDefined();
    expect(purchase?.isExpense).toBe(true);

    expect(payment).toBeDefined();
    expect(payment?.isBill).toBe(true);
    expect(payment?.isExpense).toBe(false);

    expect(refund).toBeDefined();
    expect(refund?.isEstorno).toBe(true);
    expect(refund?.isExpense).toBe(false);

    // Restore original mock values
    mockFinanceService.globalTransactions = originalGlobalTransactions;
    mockFinanceService.accounts = originalAccounts;
    mockFinanceService.categories = originalCategories;
    mockFinanceService.iconMap = originalIconMap;
  });

  it('should compute weekly transactions and subtract refunds (estornos) correctly', () => {
    const originalGlobalTransactions = mockFinanceService.globalTransactions;
    const originalAccounts = mockFinanceService.accounts;
    const originalCategories = mockFinanceService.categories;
    const originalIconMap = mockFinanceService.iconMap;

    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);

    const tDate = (offsetDays: number) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    mockFinanceService.iconMap = {
      utensils: 'ph-fork-knife',
    } as any;
    mockFinanceService.accounts = () => [
      { id: 'acc-1', name: 'Banco do Brasil', type: 'checking', initialBalance: 1000.0 } as any,
    ];
    mockFinanceService.categories = () => [
      {
        id: 'cat-1',
        name: 'Alimentação',
        color: 'text-red-600',
        cardColor: '#ff0000',
        iconName: 'utensils',
      } as any,
    ];
    mockFinanceService.globalTransactions = () => [
      {
        id: 'w1',
        description: 'Mercado',
        amount: 100.0,
        type: 'expense',
        date: tDate(1), // Tuesday
        category: 'cat-1',
        account: 'acc-1',
      } as any,
      {
        id: 'w2',
        description: 'Estorno Mercado',
        amount: 30.0,
        type: 'expense',
        date: tDate(2), // Wednesday
        category: 'cat-1',
        account: 'acc-1',
        tags: ['estorno'],
      } as any,
      {
        id: 'w3',
        description: 'Aluguel',
        amount: 50.0,
        type: 'expense',
        date: tDate(3), // Thursday
        category: 'cat-1',
        account: 'acc-1',
        spendingGroup: 'fixed',
      } as any,
      {
        id: 'w4',
        description: 'Estorno Aluguel',
        amount: 10.0,
        type: 'expense',
        date: tDate(4), // Friday
        category: 'cat-1',
        account: 'acc-1',
        spendingGroup: 'fixed',
        tags: ['estorno'],
      } as any,
    ];

    const testComponent = new DashboardComponent();
    testComponent.weekOffset.set(0);

    const txns = testComponent.weeklyTransactions();
    expect(txns.length).toBe(4);

    expect(testComponent.weeklyExpensesTotal()).toBe(110.0);
    expect(testComponent.weeklyExpensesWeeklyTotal()).toBe(70.0);
    expect(testComponent.weeklyExpensesFixedTotal()).toBe(40.0);
    expect(testComponent.weeklyExpensesEmergencyTotal()).toBe(0.0);

    const displayTxs = testComponent.displayWeeklyTransactions();
    expect(displayTxs.length).toBe(4);

    const refundWeekly = displayTxs.find((t) => t.id === 'w2');
    expect(refundWeekly).toBeDefined();
    expect(refundWeekly?.isEstorno).toBe(true);
    expect(refundWeekly?.isExpense).toBe(false);

    // Restore original mock values
    mockFinanceService.globalTransactions = originalGlobalTransactions;
    mockFinanceService.accounts = originalAccounts;
    mockFinanceService.categories = originalCategories;
    mockFinanceService.iconMap = originalIconMap;
  });
});
