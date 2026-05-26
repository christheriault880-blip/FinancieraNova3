import { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Utensils,
  Car,
  Gamepad2,
  Home,
  HeartPulse,
  CreditCard,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { deleteTransaction } from '../services/firestoreService';
import { Category } from '../types';

const categoryIcons: Record<Category, any> = {
  'Comida': Utensils,
  'Transporte': Car,
  'Ocio': Gamepad2,
  'Vivienda': Home,
  'Salud': HeartPulse,
  'Suscripciones': CreditCard,
  'Otros': MoreHorizontal,
};

const categoryColors: Record<Category, string> = {
  'Comida': 'bg-orange-100 text-orange-600',
  'Transporte': 'bg-blue-100 text-blue-600',
  'Ocio': 'bg-purple-100 text-purple-600',
  'Vivienda': 'bg-indigo-100 text-indigo-600',
  'Salud': 'bg-red-100 text-red-600',
  'Suscripciones': 'bg-red-100 text-red-800',
  'Otros': 'bg-zinc-100 text-zinc-600',
};

export default function Transactions() {
  const { user, transactions } = useAuth();
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [search, setSearch] = useState('');

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteTransaction(user.uid, id);
    } catch (e) {
      console.error('Error al eliminar transacción:', e);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === 'All' || tx.category === filter;
    const matchesSearch = tx.description.toLowerCase().includes(search.toLowerCase()) || 
                         tx.category.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Transacciones</h2>
          <p className="text-zinc-500">Gestiona y clasifica tus movimientos financieros.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-all">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-xl text-sm font-medium hover:bg-red-900 transition-all shadow-sm">
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-2">
        <button 
          onClick={() => setFilter('All')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
            filter === 'All' ? "bg-red-800 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          )}
        >
          Todos
        </button>
        {Object.keys(categoryIcons).map((cat) => (
          <button 
            key={cat}
            onClick={() => setFilter(cat as Category)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              filter === cat ? "bg-red-800 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Buscar por descripción o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 placeholder:text-zinc-400"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Transacción</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right w-16">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredTransactions.map((tx) => {
                const Icon = categoryIcons[tx.category];
                return (
                  <tr key={tx.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                          tx.type === 'income' ? "bg-red-50 text-red-800" : "bg-zinc-100 text-zinc-600"
                        )}>
                          {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <span className="font-semibold text-zinc-900">{tx.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
                        categoryColors[tx.category]
                      )}>
                        <Icon className="w-3 h-3" />
                        {tx.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(tx.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold text-right",
                      tx.type === 'income' ? "text-red-800" : "text-zinc-900"
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Eliminar transacción"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No se encontraron transacciones</h3>
            <p className="text-zinc-500 max-w-xs mx-auto mt-1">Intenta ajustar tus filtros o búsqueda para encontrar lo que buscas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
