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

export type InventoryCategory =
  | 'Inmuebles'
  | 'Vehículos'
  | 'Tecnología'
  | 'Equipamiento'
  | 'Otros';

export interface InventoryItem {
  id: string;
  uid: string;
  name: string;
  category: InventoryCategory;
  value: number;
  purchaseDate: string;
  location?: string;
  notes?: string;
}

