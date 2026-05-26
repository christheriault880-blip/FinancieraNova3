import { 
  Wallet, 
  Plus, 
  Target, 
  TrendingUp, 
  Smartphone, 
  Plane, 
  Car, 
  Home,
  ChevronRight,
  Zap,
  X,
  Trash2
} from 'lucide-react';
import { useState } from 'react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { addGoal, addTransaction, updateGoalAmount, deleteGoal } from '../services/firestoreService';
import { SavingGoal } from '../types';

const goalIcons: Record<string, any> = {
  'Smartphone': Smartphone,
  'Plane': Plane,
  'Car': Car,
  'Home': Home,
  'Target': Target,
};

export default function Savings() {
  const { user, goals, profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: 0, icon: 'Target' });

  // Funding Modal States
  const [fundingGoal, setFundingGoal] = useState<SavingGoal | null>(null);
  const [fundingAmount, setFundingAmount] = useState<number>(0);
  const [deductFromBalance, setDeductFromBalance] = useState<boolean>(true);
  const [fundingMode, setFundingMode] = useState<'deposit' | 'withdraw'>('deposit');

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await addGoal(user.uid, {
      ...newGoal,
      currentAmount: 0,
    });
    setIsModalOpen(false);
    setNewGoal({ name: '', targetAmount: 0, icon: 'Target' });
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar esta meta? El dinero ahorrado no se devolverá automáticamente a menos que lo retires primero.')) {
      try {
        await deleteGoal(user.uid, goalId);
      } catch (err) {
        console.error('Error al eliminar la meta:', err);
      }
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fundingGoal) return;

    const amount = Number(fundingAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const isWithdraw = fundingMode === 'withdraw';
      const change = isWithdraw ? -amount : amount;

      // 1. Update saving goal current amount
      const newAmount = fundingGoal.currentAmount + change;
      if (newAmount < 0) {
        alert('No puedes retirar más de lo que tienes ahorrado en esta meta.');
        return;
      }
      await updateGoalAmount(user.uid, fundingGoal.id, newAmount);

      // 2. Optionally register as expense/income transaction to adjust general balance
      if (deductFromBalance) {
        await addTransaction(user.uid, {
          description: isWithdraw ? `Retiro de ahorro: ${fundingGoal.name}` : `Ahorro: ${fundingGoal.name}`,
          amount: amount,
          type: isWithdraw ? 'income' : 'expense',
          category: 'Otros',
          date: new Date().toISOString()
        });
      }

      setFundingGoal(null);
      setFundingAmount(0);
      setFundingMode('deposit');
    } catch (err) {
      console.error('Error al procesar fondos de la meta:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Ahorro e Inversión</h2>
          <p className="text-zinc-500">Alcanza tus metas financieras con ahorro automático.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-xl text-sm font-medium hover:bg-red-900 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Meta
        </button>
      </div>

      {/* Auto-Save Highlight */}
      <div className="glass-card p-6 bg-gradient-to-br from-red-800 to-red-900 text-white border-none relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-200" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-100">Ahorro Inteligente Activo</span>
            </div>
            <h3 className="text-2xl font-bold">Has ahorrado {formatCurrency(124.50)} este mes</h3>
            <p className="text-red-50 text-sm max-w-md">Gracias al redondeo automático y transferencias programadas, estás más cerca de tus metas sin esfuerzo.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white text-red-800 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">
              Configurar
            </button>
          </div>
        </div>
        <Wallet className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Goals */}
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-800" />
            Metas Activas
          </h3>
          <div className="space-y-4">
            {goals.map((goal) => {
              const Icon = goalIcons[goal.icon] || Target;
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <div 
                  key={goal.id} 
                  className="glass-card p-5 hover:border-red-200 transition-all group cursor-pointer flex flex-col justify-between"
                  onClick={() => setFundingGoal(goal)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-600 group-hover:bg-red-50 group-hover:text-red-800 transition-colors">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">{goal.name}</h4>
                          <p className="text-xs text-zinc-500">Objetivo: {formatCurrency(goal.targetAmount)}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{formatCurrency(goal.currentAmount)}</p>
                          <p className="text-xs text-red-800 font-medium">{progress.toFixed(0)}% </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGoal(goal.id);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                          title="Eliminar meta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-800 transition-all duration-1000" 
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        <span>Progreso</span>
                        <span>{formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))} restantes</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFundingGoal(goal);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-850 hover:bg-red-900 text-white hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Aportar Fondos
                    </button>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && (
              <p className="text-center text-zinc-500 py-8 italic">No tienes metas activas. ¡Crea una para empezar a ahorrar!</p>
            )}
          </div>
        </div>

        {/* Savings Strategies */}
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-800" />
            Estrategias de Ahorro
          </h3>
          <div className="space-y-4">
            <div className="glass-card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <div className="font-bold text-lg">RD$</div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Redondeo Automático</h4>
                  <p className="text-xs text-zinc-500">Redondea cada compra al peso más cercano.</p>
                </div>
              </div>
              <div className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                profile?.roundUpEnabled ? "bg-red-800" : "bg-zinc-200"
              )}>
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition",
                  profile?.roundUpEnabled ? "translate-x-6" : "translate-x-1"
                )} />
              </div>
            </div>

            <div className="glass-card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Transferencia Periódica</h4>
                  <p className="text-xs text-zinc-500">RD$ 2,500 cada primer lunes de mes.</p>
                </div>
              </div>
              <div className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                profile?.autoSaveEnabled ? "bg-red-800" : "bg-zinc-200"
              )}>
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition",
                  profile?.autoSaveEnabled ? "translate-x-6" : "translate-x-1"
                )} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zinc-900">Nueva Meta</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Nombre de la meta</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Viaje a Japón"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newGoal.name}
                  onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Monto Objetivo ($)</label>
                <input 
                  type="number" 
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newGoal.targetAmount || ''}
                  onChange={e => setNewGoal({...newGoal, targetAmount: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Icono</label>
                <div className="flex gap-2">
                  {Object.keys(goalIcons).map(icon => {
                    const IconComp = goalIcons[icon];
                    return (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewGoal({...newGoal, icon})}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all",
                          newGoal.icon === icon ? "border-red-800 bg-red-50 text-red-800" : "border-transparent bg-zinc-100 text-zinc-400"
                        )}
                      >
                        <IconComp className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-red-800 hover:bg-red-900 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-100 mt-4"
              >
                Crear Meta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Funds/Withdraw Modal */}
      {fundingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-900">Ajustar Meta</h3>
                <p className="text-xs text-red-800 font-bold">{fundingGoal.name}</p>
              </div>
              <button 
                onClick={() => {
                  setFundingGoal(null);
                  setFundingMode('deposit');
                }} 
                className="p-2 hover:bg-zinc-100 rounded-full"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Selector: Aportar vs Disminuir */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setFundingMode('deposit')}
                className={cn(
                  "py-2 text-xs font-bold rounded-xl transition-all",
                  fundingMode === 'deposit' ? "bg-red-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                Aportar dinero
              </button>
              <button
                type="button"
                onClick={() => setFundingMode('withdraw')}
                className={cn(
                  "py-2 text-xs font-bold rounded-xl transition-all",
                  fundingMode === 'withdraw' ? "bg-red-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                Disminuir / Retirar
              </button>
            </div>
            
            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  {fundingMode === 'deposit' ? 'Monto a depositar' : 'Monto a retirar'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-400 text-sm">RD$</span>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder="0.00"
                    className="w-full pl-14 pr-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-red-800 outline-none"
                    value={fundingAmount || ''}
                    onChange={e => setFundingAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Rápido aporte buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFundingAmount(preset)}
                    className="py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold rounded-xl text-xs transition-all"
                  >
                    +RD$ {preset}
                  </button>
                ))}
              </div>

              {/* Checkbox option to deduct from balance */}
              <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                <input
                  type="checkbox"
                  id="deductBalance"
                  checked={deductFromBalance}
                  onChange={e => setDeductFromBalance(e.target.checked)}
                  className="w-4 h-4 text-red-800 border-zinc-300 rounded focus:ring-red-700 mt-1 cursor-pointer"
                />
                <label htmlFor="deductBalance" className="text-xs text-zinc-600 font-medium cursor-pointer leading-relaxed select-none">
                  {fundingMode === 'deposit' 
                    ? 'Registrar como gasto (se resta del balance general en el inicio)' 
                    : 'Registrar como ingreso (se devuelve al balance general en el inicio)'}
                </label>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-red-800 hover:bg-red-900 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-100 mt-2"
              >
                {fundingMode === 'deposit' ? 'Confirmar Ahorro' : 'Confirmar Retiro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
