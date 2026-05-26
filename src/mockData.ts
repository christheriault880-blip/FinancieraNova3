import { Transaction, SavingGoal, AIInsight } from './types';

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: 15.50,
    category: 'Comida',
    description: 'Almuerzo Trabajo',
    date: new Date().toISOString(),
    type: 'expense'
  },
  {
    id: '2',
    amount: 9.99,
    category: 'Suscripciones',
    description: 'Netflix',
    date: new Date(Date.now() - 86400000).toISOString(),
    type: 'expense'
  },
  {
    id: '3',
    amount: 45.00,
    category: 'Transporte',
    description: 'Gasolina',
    date: new Date(Date.now() - 172800000).toISOString(),
    type: 'expense'
  },
  {
    id: '4',
    amount: 1200.00,
    category: 'Otros',
    description: 'Nómina',
    date: new Date(Date.now() - 432000000).toISOString(),
    type: 'income'
  },
  {
    id: '5',
    amount: 30.00,
    category: 'Ocio',
    description: 'Cine y palomitas',
    date: new Date(Date.now() - 259200000).toISOString(),
    type: 'expense'
  }
];

export const mockGoals: SavingGoal[] = [
  {
    id: 'g1',
    name: 'Viaje a Japón',
    targetAmount: 3000,
    currentAmount: 1200,
    icon: 'Plane'
  },
  {
    id: 'g2',
    name: 'Nuevo iPhone',
    targetAmount: 1200,
    currentAmount: 450,
    icon: 'Smartphone'
  }
];

export const mockInsights: AIInsight[] = [
  {
    id: 'i1',
    type: 'warning',
    message: 'Has gastado un 15% más en comida este mes comparado con el anterior.',
    impact: '-RD$2,500'
  },
  {
    id: 'i2',
    type: 'suggestion',
    message: 'Tienes 3 suscripciones de streaming activas. ¿Realmente usas todas?',
    impact: 'Ahorra RD$1,500/mes'
  },
  {
    id: 'i3',
    type: 'praise',
    message: '¡Buen trabajo! Has alcanzado el 40% de tu meta "Viaje a Japón".',
  }
];
