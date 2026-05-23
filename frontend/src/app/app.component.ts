import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from './services/finance.service';
import { CardResumoComponent } from './components/card-resumo/card-resumo.component';
import { CardPizzaComponent } from './components/card-pizza/card-pizza.component';
import { Transaction, Account, Category } from './models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CardResumoComponent, CardPizzaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private financeService = inject(FinanceService);

  // Constants & Configs
  iconMap = this.financeService.iconMap;
  availableColors = ['bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-yellow-100 text-yellow-600', 'bg-green-100 text-green-600', 'bg-teal-100 text-teal-600', 'bg-blue-100 text-blue-600', 'bg-indigo-100 text-indigo-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-gray-100 text-gray-600'];
  cardColors = ['bg-slate-800', 'bg-blue-600', 'bg-purple-600', 'bg-orange-500', 'bg-emerald-600', 'bg-red-600', 'bg-pink-600', 'bg-cyan-600'];
  iconKeys = Object.keys(this.iconMap);

  // View State
  activeTab = signal<'dashboard'|'transactions'|'cards'|'accounts'|'categories'>('dashboard');
  currentMonthYear = signal(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  
  // Data Signals (from Service)
  globalTransactions = this.financeService.globalTransactions;
  categories = this.financeService.categories;
  accounts = this.financeService.accounts;

  // Modals & Forms State
  transactionModalOpen = signal(false);
  transactionForm = signal<any>({ description: '', amount: 0, type: 'expense', category: '', account: '', date: '' });

  categoryFormOpen = signal(false);
  categoryForm = signal<any>(null);
  
  accountFormOpen = signal(false);
  accountForm = signal<any>(null);

  paymentModalOpen = signal(false);
  billData = signal<any>(null);
  billSourceAccount = signal('');
  billError = signal('');

  menuTabs = [
    { id: 'dashboard', label: 'Home', icon: 'ph ph-house' },
    { id: 'transactions', label: 'Transactions', icon: 'ph ph-list-numbers' },
    { id: 'cards', label: 'Cards', icon: 'ph ph-credit-card' },
    { id: 'accounts', label: 'Accounts', icon: 'ph ph-bank' },
    { id: 'categories', label: 'Categories', icon: 'ph ph-tag' },
  ];

  ngOnInit() {
    this.loadExternalIcons();
  }

  private loadExternalIcons() {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@phosphor-icons/web';
    document.head.appendChild(script);
  }

  // --- COMPUTEDS ---

  debitAccounts = computed(() => this.accounts().filter(c => c.type === 'debit'));
  creditCards = computed(() => this.accounts().filter(c => c.type === 'credit'));
  
  displayCards = computed(() => {
    return this.creditCards().map(card => {
      const bill = this.getBillSummary(card);
      return {
        ...card,
        bill,
        formattedBillAmount: this.fm(bill.billAmount),
        formattedPaidAmount: this.fm(bill.paidAmount),
        formattedOpeningDate: `${bill.openingDate.getDate()}/${bill.openingDate.getMonth() + 1}`,
        formattedClosingDate: `${bill.closingDate.getDate()}/${bill.closingDate.getMonth() + 1}`,
        formattedDueDate: `${bill.dueDate.getDate()}/${(bill.dueDate.getMonth() + 1).toString().padStart(2, '0')}`
      };
    });
  });

  monthTransactions = computed(() => {
    const month = this.currentMonthYear();
    return [...this.globalTransactions()]
      .filter(t => String(t.date).startsWith(month) || t.referenceMonth === month)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  displayTransactions = computed(() => {
    return this.monthTransactions().map(t => {
      const isBill = t.type === 'credit_card_payment';
      const cat = this.getCategory(t.category, isBill);
      const con = this.getAccount(isBill ? t.sourceAccount! : t.account!);
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
        isExpense: t.type === 'expense' || isBill
      };
    });
  });

  dash = computed(() => {
    const tG = this.globalTransactions();
    const tM = this.monthTransactions();
    const cs = this.accounts();
    const cats = this.categories();

    let accountBalance = 0;
    const balancesByAccountMap: Record<string, number> = {};
    cs.filter(c => c.type === 'debit').forEach(c => {
        balancesByAccountMap[c.id] = c.initialBalance || 0;
        accountBalance += c.initialBalance || 0;
    });

    tG.forEach(t => {
      const account = cs.find(c => c.id === (t.account || t.sourceAccount));
      if (account && account.type === 'debit') {
        if (t.type === 'income') { accountBalance += t.amount; if(balancesByAccountMap[t.account!] !== undefined) balancesByAccountMap[t.account!] += t.amount; }
        if (t.type === 'expense') { accountBalance -= t.amount; if(balancesByAccountMap[t.account!] !== undefined) balancesByAccountMap[t.account!] -= t.amount; }
        if (t.type === 'credit_card_payment') { accountBalance -= t.amount; if(balancesByAccountMap[t.sourceAccount!] !== undefined) balancesByAccountMap[t.sourceAccount!] -= t.amount; }
      }
    });

    let monthIncomes = 0; let monthExpenses = 0;
    const catMap: Record<string, number> = {}; const accountMap: Record<string, number> = {};

    tM.forEach(t => {
      if (t.type === 'credit_card_payment') return;
      if (t.type === 'income') monthIncomes += t.amount;
      else if (t.type === 'expense') {
        monthExpenses += t.amount;
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        accountMap[t.account!] = (accountMap[t.account!] || 0) + t.amount;
      }
    });

    const formatChart = (map: Record<string, number>, baseList: any[], defaultColor = 'bg-gray-100 text-gray-500') => 
      Object.keys(map).map(id => {
        const item = baseList.find(i => i.id === id) || { name: 'Unknown', color: defaultColor };
        return { id, name: item.name, amount: map[id], percentage: (map[id] / (monthExpenses || 1)) * 100, hexColor: item.cardColor || this.financeService.extractHexColor(item.color) };
      }).sort((a, b) => b.amount - a.amount);

    const accountColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
    const accountsWithColor = cs.map((c, i) => ({ ...c, cardColor: accountColors[i % accountColors.length] }));

    return { 
      accountBalance, monthIncomes, monthExpenses, 
      expensesByCategory: formatChart(catMap, cats), 
      expensesByAccount: formatChart(accountMap, accountsWithColor),
      displayAccountBalances: cs.filter(c => c.type === 'debit').map(c => ({ ...c, balance: balancesByAccountMap[c.id] || 0, formattedBalance: this.fm(balancesByAccountMap[c.id] || 0) }))
    };
  });

  headerTitle = computed(() => {
    const map: Record<string, string> = { dashboard: 'Overview', transactions: 'Transactions', cards: 'Cards', accounts: 'Accounts', categories: 'Categories' };
    return map[this.activeTab()] || 'App';
  });

  currentMonthName = computed(() => {
    const [year, month] = this.currentMonthYear().split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  });

  summaryCards = computed(() => [
    { title: 'Account Balance', amount: this.dash().accountBalance, iconClass: 'ph ph-wallet', bgIcon: '', highlight: true, tooltip: 'Sum of all checking accounts' },
    { title: 'Month Incomes', amount: this.dash().monthIncomes, iconClass: 'ph ph-trend-up text-green-600', bgIcon: 'bg-green-100', highlight: false, tooltip: '' },
    { title: 'Month Expenses', amount: this.dash().monthExpenses, iconClass: 'ph ph-trend-down text-red-600', bgIcon: 'bg-red-100', highlight: false, tooltip: '' }
  ]);

  chartCards = computed(() => [
    { title: 'Expenses by Category (Month)', data: this.dash().expensesByCategory },
    { title: 'Expenses by Account/Card (Month)', data: this.dash().expensesByAccount }
  ]);

  // --- ACTIONS ---

  fm(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); }
  fd(dateString: string) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  changeMonth(delta: number) {
    const [year, month] = this.currentMonthYear().split('-').map(Number);
    let newDate = new Date(year, month - 1 + delta, 1);
    this.currentMonthYear.set(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  }

  getCategory(id: string, isBill: boolean) {
    if (isBill) return { name: 'Transfer', color: 'bg-indigo-100 text-indigo-600', iconClass: 'ph ph-arrows-left-right' };
    const cat = this.categories().find(c => c.id === id);
    return cat ? { ...cat, iconClass: this.iconMap[cat.iconName] || 'ph ph-question' } : { name: 'Unknown', color: 'bg-gray-100 text-gray-500', iconClass: 'ph ph-question' };
  }

  getAccount(id: string) { return this.accounts().find(c => c.id === id) || { name: 'Unknown' }; }

  openTransactionModal(t: any = null) {
    if (t) { this.transactionForm.set({ ...t }); } 
    else {
      const cat = this.categories().find(c => c.type === 'expense');
      const con = this.accounts()[0];
      this.transactionForm.set({ description: '', amount: '', type: 'expense', category: cat?.id || '', account: con?.id || '', date: new Date().toISOString().split('T')[0] });
    }
    this.transactionModalOpen.set(true);
  }

  closeTransactionModal() { this.transactionModalOpen.set(false); }
  updateForm(field: string, value: any) { this.transactionForm.set({ ...this.transactionForm(), [field]: value }); }
  
  setType(type: string) {
    const cat = this.categories().find(c => c.type === type);
    this.transactionForm.set({ ...this.transactionForm(), type, category: cat?.id || '' });
  }

  saveTransaction() {
    const form = this.transactionForm();
    form.amount = parseFloat(form.amount.toString().replace(',', '.'));
    if (!form.id) {
      form.id = Math.random().toString(36).substring(2, 9);
      this.financeService.addTransaction(form);
    } else {
      this.financeService.updateTransaction(form);
    }
    this.closeTransactionModal();
  }

  deleteTransaction(id: string) { this.financeService.deleteTransaction(id); }

  openCategoryForm(cat: any = null) {
    this.categoryForm.set(cat ? {...cat} : { name: '', type: 'expense', color: this.availableColors[0], iconName: 'Tags' });
    this.categoryFormOpen.set(true);
  }
  closeCategoryForm() { this.categoryFormOpen.set(false); }
  updateCategoryForm(field: string, value: any) { this.categoryForm.set({ ...this.categoryForm(), [field]: value }); }
  saveCategory() {
    const form = this.categoryForm();
    if(form.id) this.financeService.updateCategory(form);
    else this.financeService.addCategory({ ...form, id: Math.random().toString(36).substring(2, 9) });
    this.closeCategoryForm();
  }
  deleteCategory(id: string) { this.financeService.deleteCategory(id); }

  openAccountForm(isCard: boolean, account: any = null) {
    this.accountForm.set(account ? {...account} : (
      isCard 
        ? { name: '', type: 'credit', closingDay: 1, dueDay: 10, cardLastDigits: '1234', cardColor: this.cardColors[0] }
        : { name: '', type: 'debit', initialBalance: 0 }
    ));
    this.accountFormOpen.set(true);
  }
  closeAccountForm() { this.accountFormOpen.set(false); }
  updateAccountForm(field: string, value: any) { this.accountForm.set({ ...this.accountForm(), [field]: value }); }
  saveAccount() {
    const form = this.accountForm();
    if(form.type === 'debit') form.initialBalance = parseFloat(form.initialBalance.toString().replace(',', '.')) || 0;
    if(form.id) this.financeService.updateAccount(form);
    else this.financeService.addAccount({ ...form, id: Math.random().toString(36).substring(2, 9) });
    this.closeAccountForm();
  }
  deleteAccount(id: string) { this.financeService.deleteAccount(id); }

  getBillSummary(card: any) {
    const [year, month] = this.currentMonthYear().split('-').map(Number);
    const dayC = card.closingDay || 1;
    const dayD = card.dueDay || 10;
    
    const closingDate = new Date(year, month - 1, dayC);
    const openingDate = new Date(year, month - 2, dayC);
    const dueDate = new Date(year, dayD <= dayC ? month : month - 1, dayD);
    
    let totalExpenses = 0; let totalIncomes = 0; let paidAmount = 0;

    this.globalTransactions().forEach(t => {
      if (t.type === 'credit_card_payment' && t.destinationAccount === card.id && t.referenceMonth === this.currentMonthYear()) {
        paidAmount += t.amount; return;
      }
      if (t.account === card.id && t.type !== 'credit_card_payment') {
        const dateT = new Date(t.date + 'T12:00:00'); 
        if (dateT >= openingDate && dateT < closingDate) {
          if (t.type === 'expense') totalExpenses += t.amount;
          if (t.type === 'income') totalIncomes += t.amount;
        }
      }
    });

    const billAmount = Math.max(0, totalExpenses - totalIncomes);
    const today = new Date();
    let status = 'open';
    if (paidAmount >= billAmount && billAmount > 0) status = 'paid';
    else if (today >= closingDate) status = 'closed';
    if (billAmount === 0 && paidAmount === 0) status = 'zeroed';

    return { openingDate, closingDate, dueDate, billAmount, paidAmount, status };
  }

  openPayBillModal(card: any, bill: any) {
    this.billData.set({ card, bill });
    this.billError.set('');
    const debitAccount = this.accounts().find(c => c.type === 'debit');
    this.billSourceAccount.set(debitAccount ? debitAccount.id : '');
    this.paymentModalOpen.set(true);
  }
  closePayBillModal() { this.paymentModalOpen.set(false); }

  getBtnLabel() {
    const t = this.transactionForm();
    if (t.id) return 'Save Changes';
    return t.type === 'expense' ? 'Save Expense' : 'Save Income';
  }

  confirmBillPayment() {
    const { card, bill } = this.billData();
    const sourceAccount = this.billSourceAccount();
    if (!sourceAccount) { this.billError.set('Select an account to pay the bill.'); return; }

    const debitAccount = this.dash().displayAccountBalances.find((c: any) => c.id === sourceAccount);
    if (debitAccount && bill.billAmount > (debitAccount as any).balance!) {
      this.billError.set(`Insufficient balance. You have only ${this.fm((debitAccount as any).balance!)} in this account.`);
      return;
    }

    const billTransaction = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'credit_card_payment',
      description: `Bill Payment ${card.name}`,
      amount: bill.billAmount,
      category: 'others',
      sourceAccount: sourceAccount,
      destinationAccount: card.id,
      date: new Date().toISOString().split('T')[0],
      referenceMonth: this.currentMonthYear()
    };
    
    this.financeService.addTransaction(billTransaction as Transaction);
    this.closePayBillModal();
  }

  getGradient(data: any[]) {
    let cumulative = 0;
    return 'conic-gradient(' + data.map(d => {
      const start = cumulative; cumulative += d.percentage; return `${d.hexColor} ${start}% ${cumulative}%`;
    }).join(', ') + ')';
  }
}
