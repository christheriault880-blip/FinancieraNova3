import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Loader2,
  Trash2,
  Boxes
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import FinanceChart from './FinanceChart';
import { useAuth } from '../AuthContext';
import { analyzeExpenses } from '../services/geminiService';
import { deleteTransaction, subscribeToInventory } from '../services/firestoreService';
import { AIInsight, InventoryItem } from '../types';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { profile, transactions, goals, user } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  
  // Chart state is fully encapsulated within the FinanceChart component

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteTransaction(user.uid, id);
    } catch (e) {
      console.error('Error al eliminar transacción:', e);
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribeInv = subscribeToInventory(user.uid, (data) => {
      setInventoryItems(data);
    });
    return () => unsubscribeInv();
  }, [user]);

  // Calculate real metrics
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalExpenses = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalBalance = totalIncome - totalExpenses;
  const totalSavings = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalAssets = inventoryItems.reduce((sum, item) => sum + (item.value * (item.stock ?? 0)), 0);
  const netPatrimony = totalBalance + totalSavings + totalAssets;

  // Get weekly activity (last 7 days)
  const getWeeklyData = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        name: days[d.getDay()],
        dateStr: d.toISOString().split('T')[0],
        amount: 0
      };
    });

    transactions.forEach(tx => {
      const txDate = tx.date.split('T')[0];
      const dayData = last7Days.find(d => d.dateStr === txDate);
      if (dayData && tx.type === 'expense') {
        dayData.amount += tx.amount;
      }
    });

    return last7Days;
  };

  const weeklyData = getWeeklyData();

  useEffect(() => {
    const getInsights = async () => {
      if (transactions.length > 0 && insights.length === 0) {
        setIsAnalyzing(true);
        const newInsights = await analyzeExpenses(transactions);
        setInsights(newInsights);
        setIsAnalyzing(false);
      }
    };
    getInsights();
  }, [transactions]);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">¡Hola, {profile?.displayName?.split(' ')[0]}! 👋</h2>
        <p className="text-zinc-500">Aquí tienes un resumen de tus finanzas hoy.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Patrimonio Neto / Capital General */}
        <div className="glass-card p-6 bg-gradient-to-br from-zinc-950 to-zinc-900 text-white border-none shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-[9px] font-black tracking-widest text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full uppercase border border-red-900/35">Nova Capital</span>
            </div>
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Capital General / Patrimonio</p>
            <h3 className="text-2xl font-black mt-1 tracking-tight text-white select-all">{formatCurrency(netPatrimony)}</h3>
          </div>
          
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            <span>Caja: <strong className="text-white font-black">{formatCurrency(totalBalance)}</strong></span>
            <span>Ahorro: <strong className="text-green-400 font-black">{formatCurrency(totalSavings)}</strong></span>
            <span>Bienes: <strong className="text-indigo-400 font-black">{formatCurrency(totalAssets)}</strong></span>
          </div>
        </div>

        {/* Card 2: Balance Total / Caja Líquida */}
        <div className="glass-card p-6 bg-red-800 text-white border-none shadow-lg shadow-red-100 flex flex-col justify-between">
          <div>
            <div className="p-2 bg-white/15 rounded-lg w-fit mb-4">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <p className="text-red-100 text-xs font-semibold uppercase tracking-wider">Balance en Caja / Disponible</p>
            <h3 className="text-2xl font-black mt-1 tracking-tight select-all">{formatCurrency(totalBalance)}</h3>
          </div>
          <p className="text-[10px] text-red-200 font-bold uppercase tracking-wide mt-4">
            Fondos Líquidos de Caja
          </p>
        </div>

        {/* Card 3: Ingresos Totales */}
        <div className="glass-card p-6 bg-white border border-zinc-150 flex flex-col justify-between">
          <div>
            <div className="p-2 bg-blue-50 rounded-lg w-fit mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider font-sans">Ingresos Registrados</p>
            <h3 className="text-2xl font-black text-zinc-900 mt-1 tracking-tight select-all">{formatCurrency(totalIncome)}</h3>
          </div>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wide mt-4">
            Entradas Totales de Efectivo
          </p>
        </div>

        {/* Card 4: Gastos Totales */}
        <div className="glass-card p-6 bg-white border border-zinc-150 flex flex-col justify-between">
          <div>
            <div className="p-2 bg-orange-50 rounded-lg w-fit mb-4">
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider font-sans">Gastos Acumulados</p>
            <h3 className="text-2xl font-black text-zinc-900 mt-1 tracking-tight select-all">{formatCurrency(totalExpenses)}</h3>
          </div>
          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide mt-4">
            Egresos Totales de Efectivo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-zinc-900">Gastos de la Semana</h3>
            </div>
            <div className="h-[260px] w-full relative">
              <FinanceChart data={weeklyData} />
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-zinc-900">Transacciones Recientes</h3>
            </div>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-400 text-sm">No hay transacciones registradas.</p>
                </div>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-xl transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        tx.type === 'income' ? "bg-red-50 text-red-800" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{tx.description}</p>
                        <p className="text-xs text-zinc-500">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "text-sm font-bold",
                        tx.type === 'income' ? "text-red-800" : "text-zinc-900"
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Eliminar transacción"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AI Insights Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6 bg-zinc-900 text-white border-none">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-red-400" />
              <h3 className="font-bold">Insights de IA</h3>
            </div>
            <div className="space-y-4">
              {isAnalyzing ? (
                <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analizando...
                </div>
              ) : insights.length > 0 ? (
                insights.map((insight) => (
                  <div key={insight.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-sm text-zinc-300 leading-relaxed">{insight.message}</p>
                    {insight.impact && (
                      <p className="text-xs font-bold text-red-400 mt-2">{insight.impact}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">Registra más gastos para obtener consejos personalizados.</p>
              )}
            </div>
          </div>

          {/* Savings Progress */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-zinc-900 mb-4">Metas de Ahorro</h3>
            <div className="space-y-6">
              {goals.length === 0 ? (
                <p className="text-sm text-zinc-400">No tienes metas activas.</p>
              ) : (
                goals.map(goal => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-zinc-700">{goal.name}</span>
                      <span className="text-zinc-500">{Math.round((goal.currentAmount / goal.targetAmount) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-800 transition-all duration-500" 
                        style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
