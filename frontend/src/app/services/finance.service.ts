import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Transaction, Account, Category } from '../models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private http = inject(HttpClient);
  private apiUrl = '/api';

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
  globalTransactions = signal<Transaction[]>([]);
  accounts = signal<Account[]>([]);
  categories = signal<Category[]>([]);
  error = signal<string | null>(null);

  constructor() {
    this.loadData();
  }

  async loadData() {
    try {
      this.error.set(null);
      console.log('FinanceService: Loading data from API...');
      const accounts = await firstValueFrom(this.http.get<Account[]>(`${this.apiUrl}/accounts/`));
      console.log('FinanceService: Accounts loaded', accounts);
      this.accounts.set(accounts);

      const categories = await firstValueFrom(this.http.get<Category[]>(`${this.apiUrl}/categories/`));
      console.log('FinanceService: Categories loaded', categories);
      this.categories.set(categories);

      const transactions = await firstValueFrom(this.http.get<Transaction[]>(`${this.apiUrl}/transactions/`));
      console.log('FinanceService: Transactions loaded', transactions);
      this.globalTransactions.set(transactions);
    } catch (error: any) {
      console.error('FinanceService: Error loading data', error);
      let msg = 'Failed to load data.';
      if (error.status === 0) msg += ' The backend is not reachable. Check if it is running.';
      else if (error.status === 500) msg += ' Backend Internal Server Error: ' + (error.error?.detail || 'Unknown error');
      else msg += ' ' + (error.error?.detail || error.message);
      this.error.set(msg);
    }
  }

  // Utils
  extractHexColor(colorClasses: string) {
    if (!colorClasses) return '#cbd5e1'; 
    for (const key in this.tailwindColors) { if (colorClasses.includes(key)) return this.tailwindColors[key]; }
    return '#cbd5e1';
  }

  // Actions
  async addTransaction(t: Transaction) {
    try {
      this.error.set(null);
      // Remove local ID if present, let backend generate it
      const { id, ...data } = t;
      const newT = await firstValueFrom(this.http.post<Transaction>(`${this.apiUrl}/transactions/`, data));
      this.globalTransactions.update(ts => [...ts, newT]);
      return true;
    } catch (error: any) {
      console.error('Error adding transaction', error);
      this.error.set(error.error?.detail || 'Error saving transaction. Check your database permissions (RLS).');
      return false;
    }
  }

  async updateTransaction(t: Transaction) {
    try {
      this.error.set(null);
      const { id, ...data } = t;
      const updatedT = await firstValueFrom(this.http.put<Transaction>(`${this.apiUrl}/transactions/${id}`, data));
      this.globalTransactions.update(ts => ts.map(item => item.id === id ? updatedT : item));
      return true;
    } catch (error: any) {
      console.error('Error updating transaction', error);
      this.error.set(error.error?.detail || 'Error updating transaction. Check your database permissions (RLS).');
      return false;
    }
  }

  async deleteTransaction(id: string) {
    try {
      this.error.set(null);
      await firstValueFrom(this.http.delete(`${this.apiUrl}/transactions/${id}`));
      this.globalTransactions.update(ts => ts.filter(t => t.id !== id));
      return true;
    } catch (error: any) {
      console.error('Error deleting transaction', error);
      this.error.set(error.error?.detail || 'Error deleting transaction.');
      return false;
    }
  }

  async addCategory(c: Category) {
    try {
      this.error.set(null);
      const { id, ...data } = c;
      const newC = await firstValueFrom(this.http.post<Category>(`${this.apiUrl}/categories/`, data));
      this.categories.update(cs => [...cs, newC]);
      return true;
    } catch (error: any) {
      console.error('Error adding category', error);
      this.error.set(error.error?.detail || 'Error saving category. Table might be missing or RLS is blocking.');
      return false;
    }
  }

  async updateCategory(c: Category) {
    try {
      this.error.set(null);
      const { id, ...data } = c;
      const updatedC = await firstValueFrom(this.http.put<Category>(`${this.apiUrl}/categories/${id}`, data));
      this.categories.update(cs => cs.map(item => item.id === id ? updatedC : item));
      return true;
    } catch (error: any) {
      console.error('Error updating category', error);
      this.error.set(error.error?.detail || 'Error updating category.');
      return false;
    }
  }

  async deleteCategory(id: string) {
    try {
      this.error.set(null);
      await firstValueFrom(this.http.delete(`${this.apiUrl}/categories/${id}`));
      this.categories.update(cs => cs.filter(c => c.id !== id));
      return true;
    } catch (error: any) {
      console.error('Error deleting category', error);
      this.error.set(error.error?.detail || 'Error deleting category.');
      return false;
    }
  }

  async addAccount(a: Account) {
    try {
      this.error.set(null);
      const { id, ...data } = a;
      const newA = await firstValueFrom(this.http.post<Account>(`${this.apiUrl}/accounts/`, data));
      this.accounts.update(cs => [...cs, newA]);
      return true;
    } catch (error: any) {
      console.error('Error adding account', error);
      this.error.set(error.error?.detail || 'Error saving account. Check your database permissions (RLS).');
      return false;
    }
  }

  async updateAccount(a: Account) {
    try {
      this.error.set(null);
      const { id, ...data } = a;
      const updatedA = await firstValueFrom(this.http.put<Account>(`${this.apiUrl}/accounts/${id}`, data));
      this.accounts.update(as => as.map(item => item.id === id ? updatedA : item));
      return true;
    } catch (error: any) {
      console.error('Error updating account', error);
      this.error.set(error.error?.detail || 'Error updating account.');
      return false;
    }
  }

  async deleteAccount(id: string) {
    try {
      this.error.set(null);
      await firstValueFrom(this.http.delete(`${this.apiUrl}/accounts/${id}`));
      this.accounts.update(as => as.filter(a => a.id !== id));
      return true;
    } catch (error: any) {
      console.error('Error deleting account', error);
      this.error.set(error.error?.detail || 'Error deleting account.');
      return false;
    }
  }
}
