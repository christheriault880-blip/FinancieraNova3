export type Category = 
  | 'Comida' 
  | 'Transporte' 
  | 'Ocio' 
  | 'Vivienda' 
  | 'Salud' 
  | 'Suscripciones' 
  | 'Otros';

export interface Transaction {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  type: 'expense' | 'income';
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'suggestion' | 'praise';
  message: string;
  impact?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  monthlyBudget: number;
  autoSaveEnabled: boolean;
  roundUpEnabled: boolean;
}

export type InventoryCategory = string;

export interface InventoryItem {
  id: string;
  uid: string;
  name: string;
  category: string;
  value: number; // Purchase Unit Cost
  price?: number; // Retail Sell Price
  stock?: number; // Current Available Quantity
  totalSold?: number; // Total Units Sold via POS
  salesIncome?: number; // Cumulative POS Revenue for this product
  purchaseDate: string;
  location?: string;
  notes?: string;
}

export interface SoldProductDetail {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  purchaseCost: number;
  sellPrice: number;
  income: number;
  profit: number;
}

export interface DailySalesSummary {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  totalUnitsSold: number;
  totalIncome: number;
  totalProfit: number;
  productsSold: SoldProductDetail[];
}

