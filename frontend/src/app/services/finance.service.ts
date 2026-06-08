import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Transaction,
  Account,
  Category,
  OpenFinanceLinkTokenResponse,
  WeeklyGoal,
} from '../models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private http = inject(HttpClient);
  private apiUrl = '/api';

  // Configurations
  iconMap: Record<string, string> = {
    utensils: 'ph ph-fork-knife',
    car: 'ph ph-car',
    'shopping-cart': 'ph ph-shopping-cart',
    'shopping-bag': 'ph ph-shopping-bag',
    'graduation-cap': 'ph ph-graduation-cap',
    heartbeat: 'ph ph-heartbeat',
    heart: 'ph ph-heart',
    bank: 'ph ph-bank',
    landmark: 'ph ph-bank',
    'trend-up': 'ph ph-trend-up',
    'trending-up': 'ph ph-trend-up',
    'list-numbers': 'ph ph-list-numbers',
    wallet: 'ph ph-wallet',
    'credit-card': 'ph ph-credit-card',
    briefcase: 'ph ph-briefcase',
    coffee: 'ph ph-coffee',
    'device-mobile': 'ph ph-device-mobile',
    smartphone: 'ph ph-device-mobile',
    tag: 'ph ph-tag',
    tags: 'ph ph-tag',
    house: 'ph ph-house',
    home: 'ph ph-house',
    airplane: 'ph ph-airplane',
    plane: 'ph ph-airplane',
    'game-controller': 'ph ph-game-controller',
    ticket: 'ph ph-ticket',
    gift: 'ph ph-gift',
    barbell: 'ph ph-barbell',
    dumbbell: 'ph ph-barbell',
    'first-aid': 'ph ph-first-aid',
    'paw-print': 'ph ph-paw-print',
    dog: 'ph ph-paw-print',
    wrench: 'ph ph-wrench',
    lightning: 'ph ph-lightning',
    zap: 'ph ph-lightning',
    drop: 'ph ph-drop',
    'wifi-high': 'ph ph-wifi-high',
    book: 'ph ph-book',
    'music-notes': 'ph ph-music-notes',
    television: 'ph ph-television',
    scissors: 'ph ph-scissors',
    't-shirt': 'ph ph-t-shirt',
    shirt: 'ph ph-t-shirt',
    sneaker: 'ph ph-sneaker',
    baby: 'ph ph-baby',
    'soccer-ball': 'ph ph-soccer-ball',
    'beer-bottle': 'ph ph-beer-bottle',
    pizza: 'ph ph-pizza',
    hamburger: 'ph ph-hamburger',
    bus: 'ph ph-bus',
    'gas-pump': 'ph ph-gas-pump',
    bicycle: 'ph ph-bicycle',
    shield: 'ph ph-shield',
    'piggy-bank': 'ph ph-piggy-bank',
    coins: 'ph ph-coins',
    receipt: 'ph ph-receipt',
    calendar: 'ph ph-calendar',
    'magnifying-glass': 'ph ph-magnifying-glass',
    smiley: 'ph ph-smiley',
    smile: 'ph ph-smiley',
    storefront: 'ph ph-storefront',
    'plus-circle': 'ph ph-plus-circle',
    repeat: 'ph ph-repeat',
    clock: 'ph ph-clock',
    question: 'ph ph-question',
    'help-circle': 'ph ph-question',
    activity: 'ph ph-activity',
  };

  tailwindColors: Record<string, string> = {
    'text-red-600': '#dc2626',
    'text-orange-600': '#ea580c',
    'text-yellow-600': '#ca8a04',
    'text-green-600': '#16a34a',
    'text-teal-600': '#0d9488',
    'text-blue-600': '#2563eb',
    'text-indigo-600': '#4f46e5',
    'text-purple-600': '#9333ea',
    'text-pink-600': '#db2777',
    'text-gray-600': '#4b5563',
    'text-gray-500': '#6b7280',
  };

  // State
  globalTransactions = signal<Transaction[]>([]);
  accounts = signal<Account[]>([]);
  categories = signal<Category[]>([]);
  weeklyGoals = signal<WeeklyGoal[]>([]);
  error = signal<string | null>(null);
  weeklyGoal = signal<number>(this.loadWeeklyGoal());

  private loadWeeklyGoal(): number {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('weeklyGoal');
        return saved ? parseFloat(saved) : 500.0;
      } catch (e) {
        return 500.0;
      }
    }
    return 500.0;
  }

  async saveWeeklyGoal(value: number, weekMondayStr?: string) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('weeklyGoal', value.toString());
      } catch (e) {
        console.error('Failed to save weekly goal to localStorage', e);
      }
    }
    this.weeklyGoal.set(value);

    if (weekMondayStr) {
      const existing = this.weeklyGoals().find((g) => g.weekStartDate === weekMondayStr);

      const goalData = {
        weekStartDate: weekMondayStr,
        amount: value,
      };

      try {
        if (existing) {
          await firstValueFrom(
            this.http.put<WeeklyGoal>(`${this.apiUrl}/weekly-goals/${existing.id}`, goalData),
          );
        } else {
          await firstValueFrom(
            this.http.post<WeeklyGoal>(`${this.apiUrl}/weekly-goals/`, goalData),
          );
        }
        await this.loadData();
      } catch (err) {
        console.error('Failed to save weekly goal to database', err);
      }
    }
  }

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

      const categories = await firstValueFrom(
        this.http.get<Category[]>(`${this.apiUrl}/categories/`),
      );
      console.log('FinanceService: Categories loaded', categories);
      this.categories.set(categories);

      const transactions = await firstValueFrom(
        this.http.get<Transaction[]>(`${this.apiUrl}/transactions/`),
      );
      console.log('FinanceService: Transactions loaded', transactions);
      this.globalTransactions.set(transactions);

      const weeklyGoals = await firstValueFrom(
        this.http.get<WeeklyGoal[]>(`${this.apiUrl}/weekly-goals/`),
      );
      console.log('FinanceService: Weekly goals loaded', weeklyGoals);
      this.weeklyGoals.set(weeklyGoals);
    } catch (error: any) {
      console.error('FinanceService: Error loading data', error);
      let msg = 'Failed to load data.';
      if (error.status === 0) msg += ' The backend is not reachable. Check if it is running.';
      else if (error.status === 500)
        msg += ' Backend Internal Server Error: ' + (error.error?.detail || 'Unknown error');
      else msg += ' ' + (error.error?.detail || error.message);
      this.error.set(msg);
    }
  }

  // Utils
  extractHexColor(colorClasses: string) {
    if (!colorClasses) return '#cbd5e1';
    if (colorClasses.startsWith('#')) return colorClasses;
    for (const key in this.tailwindColors) {
      if (colorClasses.includes(key)) return this.tailwindColors[key];
    }
    return '#cbd5e1';
  }

  // Open Finance
  async getOpenFinanceLinkToken(): Promise<OpenFinanceLinkTokenResponse> {
    try {
      this.error.set(null);
      return await firstValueFrom(
        this.http.post<OpenFinanceLinkTokenResponse>(`${this.apiUrl}/open-finance/link-token`, {}),
      );
    } catch (error: any) {
      console.error('Error getting link token', error);
      this.error.set(error.error?.detail || 'Error getting Open Finance link token.');
      throw error;
    }
  }

  async syncPluggyAccount(itemId: string): Promise<any> {
    try {
      return await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/open-finance/sync-item/${itemId}`, {}),
      );
    } catch (error) {
      console.error('Error syncing account', error);
      throw error;
    }
  }

  // Actions
  async addTransaction(t: Transaction) {
    try {
      this.error.set(null);
      // Remove local ID if present, let backend generate it
      const { id, ...data } = t;
      const newT = await firstValueFrom(
        this.http.post<Transaction>(`${this.apiUrl}/transactions/`, data),
      );
      this.globalTransactions.update((ts) => [...ts, newT]);
      return true;
    } catch (error: any) {
      console.error('Error adding transaction', error);
      this.error.set(
        error.error?.detail || 'Error saving transaction. Check your database permissions (RLS).',
      );
      return false;
    }
  }

  async updateTransaction(t: Transaction) {
    try {
      this.error.set(null);
      const { id, ...data } = t;
      const updatedT = await firstValueFrom(
        this.http.put<Transaction>(`${this.apiUrl}/transactions/${id}`, data),
      );
      this.globalTransactions.update((ts) => ts.map((item) => (item.id === id ? updatedT : item)));
      return true;
    } catch (error: any) {
      console.error('Error updating transaction', error);
      this.error.set(
        error.error?.detail || 'Error updating transaction. Check your database permissions (RLS).',
      );
      return false;
    }
  }

  async deleteTransaction(id: string) {
    try {
      this.error.set(null);
      await firstValueFrom(this.http.delete(`${this.apiUrl}/transactions/${id}`));
      this.globalTransactions.update((ts) => ts.filter((t) => t.id !== id));
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
      const newC = await firstValueFrom(
        this.http.post<Category>(`${this.apiUrl}/categories/`, data),
      );
      this.categories.update((cs) => [...cs, newC]);
      return true;
    } catch (error: any) {
      console.error('Error adding category', error);
      this.error.set(
        error.error?.detail || 'Error saving category. Table might be missing or RLS is blocking.',
      );
      return false;
    }
  }

  async updateCategory(c: Category) {
    try {
      this.error.set(null);
      const { id, ...data } = c;
      const updatedC = await firstValueFrom(
        this.http.put<Category>(`${this.apiUrl}/categories/${id}`, data),
      );
      this.categories.update((cs) => cs.map((item) => (item.id === id ? updatedC : item)));
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
      this.categories.update((cs) => cs.filter((c) => c.id !== id));
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
      this.accounts.update((cs) => [...cs, newA]);
      return true;
    } catch (error: any) {
      console.error('Error adding account', error);
      this.error.set(
        error.error?.detail || 'Error saving account. Check your database permissions (RLS).',
      );
      return false;
    }
  }

  async updateAccount(a: Account) {
    try {
      this.error.set(null);
      const { id, ...data } = a;
      const updatedA = await firstValueFrom(
        this.http.put<Account>(`${this.apiUrl}/accounts/${id}`, data),
      );
      this.accounts.update((as) => as.map((item) => (item.id === id ? updatedA : item)));
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
      this.accounts.update((as) => as.filter((a) => a.id !== id));
      return true;
    } catch (error: any) {
      console.error('Error deleting account', error);
      this.error.set(error.error?.detail || 'Error deleting account.');
      return false;
    }
  }
}
