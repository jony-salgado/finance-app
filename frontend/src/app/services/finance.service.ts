import { Injectable, signal } from '@angular/core';
import { Transaction, Account, Category } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  // Configurations
  iconMap: Record<string, string> = { 
    Utensils: 'ph-fork-knife', Car: 'ph-car', ShoppingCart: 'ph-shopping-cart', 
    GraduationCap: 'ph-graduation-cap', HeartPulse: 'ph-heartbeat', Landmark: 'ph-bank', 
    TrendingUp: 'ph-trend-up', ListOrdered: 'ph-list-numbers', Wallet: 'ph-wallet', 
    CreditCard: 'ph-credit-card', Briefcase: 'ph-briefcase', Coffee: 'ph-coffee', 
    Smartphone: 'ph-device-mobile', Tags: 'ph-tag', HelpCircle: 'ph-question' 
  };
  
  tailwindColors: Record<string, string> = { 
    'text-red-600': '#dc2626', 'text-orange-600': '#ea580c', 'text-yellow-600': '#ca8a04', 
    'text-green-600': '#16a34a', 'text-teal-600': '#0d9488', 'text-blue-600': '#2563eb', 
    'text-indigo-600': '#4f46e5', 'text-purple-600': '#9333ea', 'text-pink-600': '#db2777', 
    'text-gray-600': '#4b5563', 'text-gray-500': '#6b7280' 
  };

  // State
  globalTransactions = signal<Transaction[]>(this.getInitialTransactions());
  categories = signal<Category[]>([
    { id: 'food', name: 'Food', iconName: 'Utensils', color: 'bg-orange-100 text-orange-600', type: 'expense' },
    { id: 'transport', name: 'Transport', iconName: 'Car', color: 'bg-blue-100 text-blue-600', type: 'expense' },
    { id: 'salary', name: 'Salary', iconName: 'Landmark', color: 'bg-green-100 text-green-600', type: 'income' },
    { id: 'investments', name: 'Investments', iconName: 'TrendingUp', color: 'bg-teal-100 text-teal-600', type: 'income' }
  ]);
  accounts = signal<Account[]>([
    { id: 'checking_account', name: 'Checking Account', type: 'debit', initialBalance: 0 },
    { id: 'nubank', name: 'Nubank Card', type: 'credit', closingDay: 5, dueDay: 12, cardLastDigits: '1234', cardColor: 'bg-purple-600' }
  ]);

  constructor() {}

  private getInitialTransactions(): Transaction[] {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const lastMonth = String(d.getMonth() === 0 ? 12 : d.getMonth()).padStart(2, '0');
    const lastMonthYear = d.getMonth() === 0 ? year - 1 : year;

    return [
      { id: '1', description: 'Salary', amount: 15400.00, type: 'income', category: 'salary', account: 'checking_account', date: `${year}-${month}-05` },
      { id: '2', description: 'Supermarket', amount: 850.50, type: 'expense', category: 'food', account: 'nubank', date: `${year}-${month}-02` },
      { id: '3', description: 'Uber', amount: 45.00, type: 'expense', category: 'transport', account: 'nubank', date: `${year}-${month}-10` },
      { id: '4', description: 'Restaurant', amount: 320.00, type: 'expense', category: 'food', account: 'nubank', date: `${lastMonthYear}-${lastMonth}-25` },
    ];
  }

  // Utils
  extractHexColor(colorClasses: string) {
    if (!colorClasses) return '#cbd5e1'; 
    for (const key in this.tailwindColors) { if (colorClasses.includes(key)) return this.tailwindColors[key]; }
    return '#cbd5e1';
  }

  // Actions
  addTransaction(t: Transaction) {
    this.globalTransactions.update(ts => [...ts, t]);
  }

  updateTransaction(t: Transaction) {
    this.globalTransactions.update(ts => ts.map(item => item.id === t.id ? t : item));
  }

  deleteTransaction(id: string) {
    this.globalTransactions.update(ts => ts.filter(t => t.id !== id));
  }

  addCategory(c: Category) {
    this.categories.update(cs => [...cs, c]);
  }

  updateCategory(c: Category) {
    this.categories.update(cs => cs.map(item => item.id === c.id ? c : item));
  }

  deleteCategory(id: string) {
    this.categories.update(cs => cs.filter(c => c.id !== id));
  }

  addAccount(c: Account) {
    this.accounts.update(cs => [...cs, c]);
  }

  updateAccount(c: Account) {
    this.accounts.update(cs => cs.map(item => item.id === c.id ? c : item));
  }

  deleteAccount(id: string) {
    this.accounts.update(cs => cs.filter(c => c.id !== id));
  }
}
