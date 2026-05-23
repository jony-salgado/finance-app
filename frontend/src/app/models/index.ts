export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  account?: string;
  sourceAccount?: string;
  destinationAccount?: string;
  date: string;
  referenceMonth?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance?: number;
  closingDay?: number;
  dueDay?: number;
  cardLastDigits?: string;
  cardColor?: string;
  balance?: number;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
  type: string;
  iconClass?: string;
}
