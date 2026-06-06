import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { AuthService } from '../../services/auth.service';
import { DashboardTabComponent } from '../tabs/dashboard-tab.component';
import { TransactionsTabComponent } from '../tabs/transactions-tab.component';
import { CardsTabComponent } from '../tabs/cards-tab.component';
import { AccountsTabComponent } from '../tabs/accounts-tab.component';
import { CategoriesTabComponent } from '../tabs/categories-tab.component';
import { MetaTabComponent } from '../tabs/meta-tab.component';
import { PrivacyButtonComponent } from '../privacy-button/privacy-button.component';
import { Transaction, Account, Category } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardTabComponent,
    TransactionsTabComponent,
    CardsTabComponent,
    AccountsTabComponent,
    CategoriesTabComponent,
    MetaTabComponent,
    PrivacyButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private financeService = inject(FinanceService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Constants & Configs
  iconMap = this.financeService.iconMap;
  availableColors = [
    'bg-red-100 text-red-600',
    'bg-orange-100 text-orange-600',
    'bg-yellow-100 text-yellow-600',
    'bg-green-100 text-green-600',
    'bg-teal-100 text-teal-600',
    'bg-blue-100 text-blue-600',
    'bg-indigo-100 text-indigo-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-gray-100 text-gray-600',
  ];
  cardColors = [
    'bg-slate-800',
    'bg-blue-600',
    'bg-purple-600',
    'bg-orange-500',
    'bg-emerald-600',
    'bg-red-600',
    'bg-pink-600',
    'bg-cyan-600',
    '#8A05BE',
    '#1A1A1A',
  ];
  iconKeys = Object.keys(this.iconMap);

  // View State
  activeTab = signal<'dashboard' | 'transactions' | 'cards' | 'accounts' | 'categories' | 'meta'>(
    'dashboard',
  );
  currentMonthYear = signal(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  );

  // Data Signals (from Service)
  globalTransactions = this.financeService.globalTransactions;
  categories = this.financeService.categories;
  accounts = this.financeService.accounts;
  error = this.financeService.error;
  weeklyGoal = this.financeService.weeklyGoal;

  // Modals & Forms State
  transactionModalOpen = signal(false);
  transactionDetailModalOpen = signal(false);
  selectedTransactionForDetail = signal<any>(null);
  deleteConfirmOpen = signal(false);
  transactionForm = signal<any>({
    description: '',
    amount: 0,
    type: 'expense',
    category: '',
    account: '',
    date: '',
  });

  categoryFormOpen = signal(false);
  categoryForm = signal<any>(null);

  accountFormOpen = signal(false);
  accountForm = signal<any>(null);

  paymentModalOpen = signal(false);
  billData = signal<any>(null);
  billSourceAccount = signal('');
  billError = signal('');
  syncingAccountId = signal<string | null>(null);

  // Selected Card for transaction list details
  selectedCardIdForTransactions = signal<string | null>(null);

  // Weekly Goal Edit State
  weeklyGoalEditing = signal(false);
  weeklyGoalInput = signal<number>(500);

  // Weekly Spending Filter State
  weeklySpendingFilter = signal<'all' | 'weekly' | 'fixed' | 'emergency'>('all');

  // Account/Card Filter State for Transactions Tab
  selectedAccountFilter = signal<string>('all');

  menuTabs = [
    { id: 'dashboard', label: 'Home', icon: 'ph ph-house' },
    { id: 'transactions', label: 'Transactions', icon: 'ph ph-list-numbers' },
    { id: 'cards', label: 'Cards', icon: 'ph ph-credit-card' },
    { id: 'accounts', label: 'Accounts', icon: 'ph ph-bank' },
    { id: 'categories', label: 'Categories', icon: 'ph ph-tag' },
    { id: 'meta', label: 'Meta', icon: 'ph ph-gauge' },
  ];

  ngOnInit() {
    this.loadExternalIcons();
    // Periodically reload data to pick up automatic background syncs (every 30 seconds)
    setInterval(() => {
      this.financeService.loadData();
    }, 30000);
  }

  private loadExternalIcons() {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@phosphor-icons/web';
    document.head.appendChild(script);
  }

  // --- COMPUTEDS ---

  debitAccounts = computed(() =>
    this.accounts().filter((c) => c.type === 'checking' || c.type === 'investment'),
  );
  creditCards = computed(() => this.accounts().filter((c) => c.type === 'credit_card'));

  displayCards = computed(() => {
    return this.creditCards().map((card) => {
      const bill = this.getBillSummary(card);
      return {
        ...card,
        bill,
        formattedBillAmount: this.fm(bill.billAmount),
        formattedPaidAmount: this.fm(bill.paidAmount),
        formattedOpeningDate: `${bill.openingDate.getDate()}/${bill.openingDate.getMonth() + 1}`,
        formattedClosingDate: `${bill.closingDate.getDate()}/${bill.closingDate.getMonth() + 1}`,
        formattedDueDate: `${bill.dueDate.getDate()}/${(bill.dueDate.getMonth() + 1).toString().padStart(2, '0')}`,
      };
    });
  });

  monthTransactions = computed(() => {
    const month = this.currentMonthYear();
    return [...this.globalTransactions()]
      .filter((t) => String(t.date).startsWith(month) || t.referenceMonth === month)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  displayTransactions = computed(() => {
    const filterId = this.selectedAccountFilter();
    return this.monthTransactions()
      .filter((t) => {
        if (filterId === 'all') return true;
        const isBill = t.type === 'credit_card_payment';
        if (isBill) {
          const srcAcc = t.sourceAccount || (t as any).source_account_id;
          const destAcc = t.destinationAccount || (t as any).destination_account_id;
          return srcAcc === filterId || destAcc === filterId;
        } else {
          const accId = t.account || (t as any).account_id;
          const cardTag = t.tags && t.tags.find((tag: string) => tag.startsWith('estorno_card:'));
          const estornoCardId = cardTag ? cardTag.split(':')[1] : null;
          return accId === filterId || estornoCardId === filterId;
        }
      })
      .map((t) => {
        const isBill = t.type === 'credit_card_payment';
        const categoryId = t.category || (t as any).category_id;
        const accountId = isBill
          ? t.sourceAccount || (t as any).source_account_id
          : t.account || (t as any).account_id;

        const cat = this.getCategory(categoryId, isBill);
        const con = this.getAccount(accountId);
        return {
          ...t,
          isBill,
          absoluteAmount: Math.abs(t.amount),
          formattedAmount: this.fm(t.amount),
          formattedDate: this.fd(t.date),
          catName: cat.name,
          catColor: cat.color,
          catIcon: cat.iconClass,
          accountName: isBill ? `From: ${con.name}` : con.name,
          isExpense: t.type === 'expense' || isBill,
        };
      });
  });

  selectedCardTransactions = computed(() => {
    const cardId = this.selectedCardIdForTransactions();
    if (!cardId) return [];

    const card = this.accounts().find((c) => c.id === cardId);
    if (!card) return [];

    const bill = this.getBillSummary(card);
    const openingDate = bill.openingDate;
    const closingDate = bill.closingDate;

    return this.globalTransactions()
      .filter((t) => {
        // 1. Is it a bill payment for this card?
        if (
          t.type === 'credit_card_payment' &&
          (t.destinationAccount === cardId || (t as any).destination_account_id === cardId)
        ) {
          return t.referenceMonth === this.currentMonthYear();
        }

        // 2. Is it a refund (estorno) for this card?
        const hasEstornoTag = t.tags && t.tags.includes('estorno');
        const cardTag = t.tags && t.tags.find((tag: string) => tag.startsWith('estorno_card:'));
        const targetCardId = cardTag ? cardTag.split(':')[1] : t.account || (t as any).account_id;
        if (hasEstornoTag && targetCardId === cardId) {
          const dateT = new Date(t.date + 'T12:00:00');
          return (
            (dateT >= openingDate && dateT < closingDate) ||
            t.referenceMonth === this.currentMonthYear()
          );
        }

        // 3. Is it a normal card expense/income in the bill period?
        if (
          (t.account === cardId || (t as any).account_id === cardId) &&
          t.type !== 'credit_card_payment'
        ) {
          const dateT = new Date(t.date + 'T12:00:00');
          return dateT >= openingDate && dateT < closingDate;
        }

        return false;
      })
      .map((t) => {
        const isBill = t.type === 'credit_card_payment';
        const hasEstornoTag = !!(t.tags && t.tags.includes('estorno'));
        const categoryId = t.category || (t as any).category_id;
        const accountId = isBill
          ? t.sourceAccount || (t as any).source_account_id
          : t.account || (t as any).account_id;

        const cat = this.getCategory(categoryId, isBill);
        const con = this.getAccount(accountId);
        const isExpense = t.type === 'expense' && !hasEstornoTag && !isBill;

        return {
          ...t,
          isBill,
          isEstorno: hasEstornoTag,
          absoluteAmount: Math.abs(t.amount),
          formattedAmount: this.fm(t.amount),
          formattedDate: this.fd(t.date),
          catName: hasEstornoTag ? 'Refund' : cat.name,
          catColor: hasEstornoTag ? 'bg-emerald-100 text-emerald-600' : cat.color,
          catIcon: hasEstornoTag ? 'ph ph-arrow-counter-clockwise' : cat.iconClass,
          accountName: isBill ? `From: ${con.name}` : con.name,
          isExpense,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  dash = computed(() => {
    const tG = this.globalTransactions();
    const tM = this.monthTransactions();
    const cs = this.accounts();
    const cats = this.categories();

    let accountBalance = 0;
    const balancesByAccountMap: Record<string, number> = {};
    cs.filter((c) => c.type === 'checking' || c.type === 'investment').forEach((c) => {
      balancesByAccountMap[c.id] = c.initialBalance || 0;
      accountBalance += c.initialBalance || 0;
    });

    tG.forEach((t) => {
      const accId =
        t.account || (t as any).account_id || t.sourceAccount || (t as any).source_account_id;
      const account = cs.find((c) => c.id === accId);
      if (account && (account.type === 'checking' || account.type === 'investment')) {
        if (t.type === 'income') {
          accountBalance += t.amount;
          if (balancesByAccountMap[account.id] !== undefined)
            balancesByAccountMap[account.id] += t.amount;
        }
        if (t.type === 'expense') {
          accountBalance -= t.amount;
          if (balancesByAccountMap[account.id] !== undefined)
            balancesByAccountMap[account.id] -= t.amount;
        }
        if (t.type === 'credit_card_payment') {
          accountBalance -= t.amount;
          if (balancesByAccountMap[account.id] !== undefined)
            balancesByAccountMap[account.id] -= t.amount;
        }
      }
    });

    let monthIncomes = 0;
    let monthExpenses = 0;
    const catMap: Record<string, number> = {};
    const accountMap: Record<string, number> = {};
    const groupMap: Record<string, number> = {};

    tM.forEach((t) => {
      if (t.type === 'credit_card_payment') return;
      const catId = t.category || (t as any).category_id || 'unknown';
      const accId = t.account || (t as any).account_id;

      if (t.type === 'income') monthIncomes += t.amount;
      else if (t.type === 'expense') {
        monthExpenses += t.amount;
        catMap[catId] = (catMap[catId] || 0) + t.amount;
        if (accId) accountMap[accId] = (accountMap[accId] || 0) + t.amount;
        const grp = t.spendingGroup || 'weekly';
        groupMap[grp] = (groupMap[grp] || 0) + t.amount;
      }
    });

    const formatChart = (
      map: Record<string, number>,
      baseList: any[],
      defaultColor = 'bg-gray-100 text-gray-500',
    ) =>
      Object.keys(map)
        .map((id) => {
          const item = baseList.find((i) => i.id === id) || {
            name: 'Unknown',
            color: defaultColor,
          };
          return {
            id,
            name: item.name,
            amount: map[id],
            percentage: (map[id] / (monthExpenses || 1)) * 100,
            hexColor: item.cardColor || this.financeService.extractHexColor(item.color),
          };
        })
        .sort((a, b) => b.amount - a.amount);

    const accountColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
    const accountsWithColor = cs.map((c, i) => ({
      ...c,
      cardColor: accountColors[i % accountColors.length],
    }));

    const groupMetadata: Record<string, { name: string; hexColor: string }> = {
      weekly: { name: 'Weekly', hexColor: '#4f46e5' },
      fixed: { name: 'Fixed', hexColor: '#4b5563' },
      emergency: { name: 'Emergency', hexColor: '#dc2626' },
    };

    const expensesByGroup = Object.keys(groupMap)
      .map((grp) => {
        const meta = groupMetadata[grp] || { name: grp, hexColor: '#cbd5e1' };
        return {
          id: grp,
          name: meta.name,
          amount: groupMap[grp],
          percentage: (groupMap[grp] / (monthExpenses || 1)) * 100,
          hexColor: meta.hexColor,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      accountBalance,
      monthIncomes,
      monthExpenses,
      expensesByCategory: formatChart(catMap, cats),
      expensesByAccount: formatChart(accountMap, accountsWithColor),
      expensesByGroup,
      displayAccountBalances: cs
        .filter((c) => c.type === 'checking' || c.type === 'investment')
        .map((c) => ({
          ...c,
          balance: balancesByAccountMap[c.id] || 0,
          formattedBalance: this.fm(balancesByAccountMap[c.id] || 0),
        })),
    };
  });

  headerTitle = computed(() => {
    const map: Record<string, string> = {
      dashboard: 'Overview',
      transactions: 'Transactions',
      cards: 'Cards',
      accounts: 'Accounts',
      categories: 'Categories',
      meta: 'Meta Semanal',
    };
    return map[this.activeTab()] || 'App';
  });

  currentWeekRange = computed(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);

    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
  });

  formattedWeekRange = computed(() => {
    const range = this.currentWeekRange();
    const startStr = `${range.start.getDate().toString().padStart(2, '0')}/${(range.start.getMonth() + 1).toString().padStart(2, '0')}`;
    const endStr = `${range.end.getDate().toString().padStart(2, '0')}/${(range.end.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${startStr} a ${endStr}`;
  });

  weeklyTransactions = computed(() => {
    const range = this.currentWeekRange();
    return this.globalTransactions()
      .filter((t) => {
        if (!t.date) return false;
        // Only include actual expenses in the weekly budget (Meta) tab calculations and list
        if (t.type !== 'expense') return false;
        const tDate = new Date(t.date + 'T00:00:00');
        return tDate >= range.start && tDate <= range.end;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  displayWeeklyTransactions = computed(() => {
    const filter = this.weeklySpendingFilter();
    let txs = this.weeklyTransactions();

    if (filter !== 'all') {
      txs = txs.filter((t) => {
        const group = t.spendingGroup || 'weekly';
        return group === filter;
      });
    }

    return txs.map((t) => {
      const isBill = t.type === 'credit_card_payment';
      const categoryId = t.category || (t as any).category_id;
      const accountId = isBill
        ? t.sourceAccount || (t as any).source_account_id
        : t.account || (t as any).account_id;

      const cat = this.getCategory(categoryId, isBill);
      const con = this.getAccount(accountId);
      return {
        ...t,
        isBill,
        absoluteAmount: Math.abs(t.amount),
        formattedAmount: this.fm(t.amount),
        formattedDate: this.fd(t.date),
        catName: cat.name,
        catColor: cat.color,
        catIcon: cat.iconClass,
        accountName: isBill ? `From: ${con.name}` : con.name,
        isExpense: t.type === 'expense' || isBill,
      };
    });
  });

  weeklyExpensesTotal = computed(() => {
    return this.weeklyTransactions()
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  });

  weeklyExpensesWeeklyTotal = computed(() => {
    return this.weeklyTransactions()
      .filter((t) => t.type === 'expense' && (t.spendingGroup === 'weekly' || !t.spendingGroup))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  });

  weeklyExpensesFixedTotal = computed(() => {
    return this.weeklyTransactions()
      .filter((t) => t.type === 'expense' && t.spendingGroup === 'fixed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  });

  weeklyExpensesEmergencyTotal = computed(() => {
    return this.weeklyTransactions()
      .filter((t) => t.type === 'expense' && t.spendingGroup === 'emergency')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  });

  currentMonthName = computed(() => {
    const [year, month] = this.currentMonthYear().split('-');
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  });

  summaryCards = computed(() => [
    {
      title: 'Account Balance',
      amount: this.dash().accountBalance,
      iconClass: 'ph ph-wallet',
      bgIcon: '',
      highlight: true,
      tooltip: 'Sum of all checking accounts',
    },
    {
      title: 'Month Incomes',
      amount: this.dash().monthIncomes,
      iconClass: 'ph ph-trend-up text-green-600',
      bgIcon: 'bg-green-100',
      highlight: false,
      tooltip: '',
    },
    {
      title: 'Month Expenses',
      amount: this.dash().monthExpenses,
      iconClass: 'ph ph-trend-down text-red-600',
      bgIcon: 'bg-red-100',
      highlight: false,
      tooltip: '',
    },
  ]);

  chartCards = computed(() => [
    { title: 'Expenses by Category (Month)', data: this.dash().expensesByCategory },
    { title: 'Expenses by Account/Card (Month)', data: this.dash().expensesByAccount },
    { title: 'Expenses by Group (Month)', data: this.dash().expensesByGroup },
  ]);

  // --- ACTIONS ---

  selectTab(tabId: 'dashboard' | 'transactions' | 'cards' | 'accounts' | 'categories' | 'meta') {
    this.activeTab.set(tabId);
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }

  startEditingGoal() {
    this.weeklyGoalInput.set(this.weeklyGoal());
    this.weeklyGoalEditing.set(true);
  }

  cancelEditingGoal() {
    this.weeklyGoalEditing.set(false);
  }

  confirmEditingGoal() {
    const val = parseFloat(this.weeklyGoalInput().toString());
    if (!isNaN(val) && val >= 0) {
      this.financeService.saveWeeklyGoal(val);
    }
    this.weeklyGoalEditing.set(false);
  }

  toggleFilter(filter: 'weekly' | 'fixed' | 'emergency') {
    if (this.weeklySpendingFilter() === filter) {
      this.weeklySpendingFilter.set('all');
    } else {
      this.weeklySpendingFilter.set(filter);
    }
  }

  fm(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      value || 0,
    );
  }
  fd(dateString: string) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  changeMonth(delta: number) {
    const [year, month] = this.currentMonthYear().split('-').map(Number);
    let newDate = new Date(year, month - 1 + delta, 1);
    this.currentMonthYear.set(
      `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`,
    );
  }

  getCategory(id: string, isBill: boolean) {
    if (isBill)
      return {
        name: 'Transfer',
        color: 'bg-indigo-100 text-indigo-600',
        iconClass: 'ph ph-arrows-left-right',
      };
    const cat = this.categories().find((c) => c.id === id);
    return cat
      ? { ...cat, iconClass: this.iconMap[cat.iconName.toLowerCase()] || 'ph ph-question' }
      : { name: 'Unknown', color: 'bg-gray-100 text-gray-500', iconClass: 'ph ph-question' };
  }

  getAccount(id: string) {
    return this.accounts().find((c) => c.id === id) || { name: 'Unknown' };
  }

  openTransactionDetail(t: any) {
    this.selectedTransactionForDetail.set(t);
    this.deleteConfirmOpen.set(false);
    this.transactionDetailModalOpen.set(true);
  }

  closeTransactionDetail() {
    this.transactionDetailModalOpen.set(false);
    this.selectedTransactionForDetail.set(null);
  }

  editFromDetail() {
    const t = this.selectedTransactionForDetail();
    this.closeTransactionDetail();
    this.openTransactionModal(t);
  }

  confirmDeleteFromDetail() {
    const t = this.selectedTransactionForDetail();
    if (t) {
      this.deleteTransaction(t.id);
      this.closeTransactionDetail();
    }
  }

  openTransactionModal(t: any = null) {
    if (t) {
      const hasEstorno = !!(t.tags && t.tags.includes('estorno'));
      const estornoCardTag =
        t.tags && t.tags.find((tag: string) => tag.startsWith('estorno_card:'));
      const estornoCardId = estornoCardTag
        ? estornoCardTag.split(':')[1]
        : hasEstorno
          ? t.account || t.account_id
          : '';

      const isBillPayment = t.type === 'credit_card_payment';
      const billPaymentCardId = isBillPayment
        ? t.destinationAccount || t.destination_account_id
        : '';

      this.transactionForm.set({
        ...t,
        category: t.category || t.category_id || '',
        account:
          t.account ||
          t.account_id ||
          (isBillPayment ? t.sourceAccount || t.source_account_id : ''),
        spendingGroup: t.spendingGroup || 'weekly',
        isEstorno: hasEstorno,
        estornoCardId: estornoCardId || '',
        isBillPayment: isBillPayment,
        billPaymentCardId: billPaymentCardId || '',
      });
    } else {
      const cat = this.categories().find((c) => c.type === 'expense');
      const con = this.accounts()[0];
      this.transactionForm.set({
        description: '',
        amount: '',
        type: 'expense',
        category: cat?.id || '',
        account: con?.id || '',
        date: new Date().toISOString().split('T')[0],
        spendingGroup: 'weekly',
        isEstorno: false,
        estornoCardId: '',
        isBillPayment: false,
        billPaymentCardId: '',
      });
    }
    this.transactionModalOpen.set(true);
  }

  closeTransactionModal() {
    this.transactionModalOpen.set(false);
  }
  updateForm(field: string, value: any) {
    this.transactionForm.set({ ...this.transactionForm(), [field]: value });
  }

  setType(type: string) {
    const cat = this.categories().find((c) => c.type === type);
    this.transactionForm.set({ ...this.transactionForm(), type, category: cat?.id || '' });
  }

  async saveTransaction() {
    const form = { ...this.transactionForm() };
    form.amount = parseFloat(form.amount.toString().replace(',', '.'));

    // Handle Estorno
    if (form.isEstorno) {
      const otherTags = (form.tags || []).filter(
        (tag: string) => tag !== 'estorno' && !tag.startsWith('estorno_card:'),
      );
      form.tags = [...otherTags, 'estorno'];
      if (form.estornoCardId) {
        form.tags.push(`estorno_card:${form.estornoCardId}`);
      }
    } else {
      if (form.tags) {
        form.tags = form.tags.filter(
          (tag: string) => tag !== 'estorno' && !tag.startsWith('estorno_card:'),
        );
      }
    }

    // Handle Bill Payment
    if (form.isBillPayment) {
      form.type = 'credit_card_payment';
      form.sourceAccount = form.account;
      form.destinationAccount = form.billPaymentCardId;
      form.category = '';
      form.referenceMonth = String(form.date).substring(0, 7);
    } else {
      if (form.type === 'credit_card_payment') {
        form.type = 'expense';
      }
      form.sourceAccount = undefined;
      form.destinationAccount = undefined;
    }

    // Clean up temporary UI fields
    delete form.isEstorno;
    delete form.estornoCardId;
    delete form.isBillPayment;
    delete form.billPaymentCardId;

    if (!form.id) {
      await this.financeService.addTransaction(form);
    } else {
      await this.financeService.updateTransaction(form);
    }
    this.closeTransactionModal();
  }

  deleteTransaction(id: string) {
    this.financeService.deleteTransaction(id);
  }

  openCategoryForm(cat: any = null) {
    this.categoryForm.set(
      cat
        ? { ...cat }
        : { name: '', type: 'expense', color: this.availableColors[0], iconName: 'Tags' },
    );
    this.categoryFormOpen.set(true);
  }
  closeCategoryForm() {
    this.categoryFormOpen.set(false);
  }
  updateCategoryForm(field: string, value: any) {
    this.categoryForm.set({ ...this.categoryForm(), [field]: value });
  }
  saveCategory() {
    const form = this.categoryForm();
    if (form.id) this.financeService.updateCategory(form);
    else this.financeService.addCategory(form);
    this.closeCategoryForm();
  }
  deleteCategory(id: string) {
    this.financeService.deleteCategory(id);
  }

  openAccountForm(isCard: boolean, account: any = null) {
    this.accountForm.set(
      account
        ? { ...account }
        : isCard
          ? {
              name: '',
              type: 'credit_card',
              closingDay: 1,
              dueDay: 10,
              cardLastDigits: '1234',
              cardColor: this.cardColors[0],
            }
          : { name: '', type: 'checking', initialBalance: 0 },
    );
    this.accountFormOpen.set(true);
  }
  closeAccountForm() {
    this.accountFormOpen.set(false);
  }
  updateAccountForm(field: string, value: any) {
    this.accountForm.set({ ...this.accountForm(), [field]: value });
  }
  saveAccount() {
    const form = this.accountForm();
    if (form.type === 'checking' || form.type === 'investment')
      form.initialBalance = parseFloat(form.initialBalance.toString().replace(',', '.')) || 0;
    if (form.id) this.financeService.updateAccount(form);
    else this.financeService.addAccount(form);
    this.closeAccountForm();
  }
  deleteAccount(id: string) {
    this.financeService.deleteAccount(id);
  }

  async refreshAccount(account: any) {
    if (!account.providerItemId) {
      alert(
        'Erro: Esta conta não possui uma conexão vinculada no banco. Certifique-se de que a coluna provider_item_id foi adicionada no banco de dados e reconecte.',
      );
      return;
    }
    this.syncingAccountId.set(account.id);
    try {
      const res = await this.financeService.syncPluggyAccount(account.providerItemId);
      alert(
        `Sincronização concluída!\n\nForam adicionadas ${res.transactions_added} novas transações dos últimos 30 dias para a conta "${account.name}".`,
      );
      await this.financeService.loadData();
    } catch (err) {
      console.error(err);
      alert(
        'Ocorreu um erro ao atualizar a conta. Verifique se o servidor está online e se a coluna provider_item_id foi adicionada no banco de dados.',
      );
    } finally {
      this.syncingAccountId.set(null);
    }
  }

  getBillSummary(card: any) {
    const [year, month] = this.currentMonthYear().split('-').map(Number);
    const dayC = card.closingDay || 1;
    const dayD = card.dueDay || 10;

    const closingDate = new Date(year, month - 1, dayC);
    const openingDate = new Date(year, month - 2, dayC);
    const dueDate = new Date(year, dayD <= dayC ? month : month - 1, dayD);

    let totalExpenses = 0;
    let totalIncomes = 0;
    let paidAmount = 0;
    let estornosAmount = 0;

    this.globalTransactions().forEach((t) => {
      // 1. Check if it's a refund (estorno) for this card
      const hasEstornoTag = t.tags && t.tags.includes('estorno');
      const cardTag = t.tags && t.tags.find((tag: string) => tag.startsWith('estorno_card:'));
      const targetCardId = cardTag ? cardTag.split(':')[1] : t.account || (t as any).account_id;
      const isEstornoForThisCard = hasEstornoTag && targetCardId === card.id;

      if (isEstornoForThisCard) {
        const dateT = new Date(t.date + 'T12:00:00');
        if (
          (dateT >= openingDate && dateT < closingDate) ||
          t.referenceMonth === this.currentMonthYear()
        ) {
          estornosAmount += Math.abs(t.amount);
          // A refund reduces the bill, so treat it as income/credit
          totalIncomes += Math.abs(t.amount);
        }
        return;
      }

      if (
        t.type === 'credit_card_payment' &&
        (t.destinationAccount === card.id || (t as any).destination_account_id === card.id) &&
        t.referenceMonth === this.currentMonthYear()
      ) {
        paidAmount += t.amount;
        return;
      }
      if (
        (t.account === card.id || (t as any).account_id === card.id) &&
        t.type !== 'credit_card_payment'
      ) {
        const dateT = new Date(t.date + 'T12:00:00');
        if (dateT >= openingDate && dateT < closingDate) {
          if (t.type === 'expense') totalExpenses += t.amount;
          if (t.type === 'income') totalIncomes += t.amount;
        }
      }
    });

    let billAmount = Math.max(0, totalExpenses - totalIncomes);

    // If it's the current month and the card is linked to Pluggy, use the real-time balance
    const currentCalendarMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (
      card.providerId === 'pluggy' &&
      this.currentMonthYear() === currentCalendarMonth &&
      card.initialBalance !== undefined &&
      card.initialBalance !== null
    ) {
      billAmount = Math.max(0, card.initialBalance - estornosAmount);
    }

    const today = new Date();
    let status = 'open';
    if (paidAmount >= billAmount && billAmount > 0) status = 'paid';
    else if (today >= closingDate) status = 'closed';
    if (billAmount === 0 && paidAmount === 0) status = 'zeroed';

    return { openingDate, closingDate, dueDate, billAmount, paidAmount, status };
  }

  toggleCardTransactions(id: string) {
    this.selectedCardIdForTransactions.set(this.selectedCardIdForTransactions() === id ? null : id);
  }

  openPayBillModal(card: any, bill: any) {
    this.billData.set({ card, bill });
    this.billError.set('');
    const debitAccount = this.accounts().find((c) => c.type === 'debit');
    this.billSourceAccount.set(debitAccount ? debitAccount.id : '');
    this.paymentModalOpen.set(true);
  }
  closePayBillModal() {
    this.paymentModalOpen.set(false);
  }

  getBtnLabel() {
    const t = this.transactionForm();
    if (t.id) return 'Save Changes';
    return t.type === 'expense' ? 'Save Expense' : 'Save Income';
  }

  confirmBillPayment() {
    const { card, bill } = this.billData();
    const sourceAccount = this.billSourceAccount();
    if (!sourceAccount) {
      this.billError.set('Select an account to pay the bill.');
      return;
    }

    const amountToPay = Math.max(0, bill.billAmount - bill.paidAmount);

    const debitAccount = this.dash().displayAccountBalances.find(
      (c: any) => c.id === sourceAccount,
    );
    if (debitAccount && amountToPay > (debitAccount as any).balance!) {
      this.billError.set(
        `Insufficient balance. You have only ${this.fm((debitAccount as any).balance!)} in this account.`,
      );
      return;
    }

    const billTransaction = {
      type: 'credit_card_payment',
      description: `Bill Payment ${card.name}`,
      amount: amountToPay,
      category: '',
      sourceAccount: sourceAccount,
      destinationAccount: card.id,
      date: new Date().toISOString().split('T')[0],
      referenceMonth: this.currentMonthYear(),
    };

    this.financeService.addTransaction(billTransaction as any);
    this.closePayBillModal();
  }

  getGradient(data: any[]) {
    let cumulative = 0;
    return (
      'conic-gradient(' +
      data
        .map((d) => {
          const start = cumulative;
          cumulative += d.percentage;
          return `${d.hexColor} ${start}% ${cumulative}%`;
        })
        .join(', ') +
      ')'
    );
  }

  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  }
}
