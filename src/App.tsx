/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Wallet, 
  MessageSquareText, 
  User as UserIcon,
  Plus,
  Bell,
  Search,
  LogIn,
  Loader2,
  X,
  Shield,
  Boxes,
  FileText,
  Calendar,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useAuth } from './AuthContext';
import { loginWithGoogle } from './firebase';
import { addTransaction } from './services/firestoreService';
import { Category } from './types';

// Components
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Savings from './components/Savings';
import AIChat from './components/AIChat';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import Inventory from './components/Inventory';
import Billing from './components/Billing';
import Agenda from './components/Agenda';
import NotificationsPopover from './components/NotificationsPopover';
import Loans from './components/Loans';

type Tab = 'dashboard' | 'transactions' | 'savings' | 'ai' | 'profile' | 'admin' | 'inventory' | 'billing' | 'agenda' | 'loans';

const categories: Category[] = ['Comida', 'Transporte', 'Ocio', 'Vivienda', 'Salud', 'Suscripciones', 'Otros'];

const Logo = ({ className }: { className?: string }) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    <svg viewBox="0 0 500 500" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Definimos el gradiente rojo para mayor profesionalismo */}
      <defs>
        <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>
      
      {/* Círculo Swoosh Exterior (Diseño Caligráfico) */}
      <path 
        d="M120 180 C 80 250 100 350 200 380 C 300 410 400 350 420 250" 
        stroke="url(#redGradient)" 
        strokeWidth="15" 
        strokeLinecap="round" 
      />
      <path 
        d="M140 160 C 100 60 250 50 350 100 C 420 140 430 220 410 280" 
        stroke="url(#redGradient)" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeOpacity="0.6"
      />
      
      {/* Símbolo de Dolar Centrado */}
      <text 
        x="240" 
        y="270" 
        textAnchor="middle" 
        dominantBaseline="middle" 
        fill="url(#redGradient)" 
        className="font-bold select-none"
        style={{ fontFamily: "'Times New Roman', serif", fontSize: "220px", fontWeight: "900" }}
      >
        $
      </text>

      {/* Flecha de Crecimiento (Gruesa y con punta definida) */}
      <path 
        d="M280 350 C 350 330 400 250 420 150" 
        stroke="url(#redGradient)" 
        strokeWidth="20" 
        strokeLinecap="round" 
      />
      <path 
        d="M380 180 L 420 130 L 460 180" 
        fill="url(#redGradient)"
        stroke="url(#redGradient)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      
      {/* Barras de Crecimiento (3 barras ajustadas al estilo de la foto) */}
      <rect x="360" y="320" width="22" height="60" rx="4" fill="url(#redGradient)" />
      <rect x="395" y="270" width="22" height="110" rx="4" fill="url(#redGradient)" />
      <rect x="430" y="220" width="22" height="160" rx="4" fill="url(#redGradient)" />
    </svg>
  </div>
);

export default function App() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({
    description: '',
    amount: 0,
    category: 'Otros' as Category,
    type: 'expense' as 'income' | 'expense'
  });

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'loans', label: 'Préstamos', icon: Coins },
    { id: 'transactions', label: 'Gastos', icon: ReceiptText },
    { id: 'savings', label: 'Ahorro', icon: Wallet },
    { id: 'inventory', label: 'Inventario', icon: Boxes },
    { id: 'billing', label: 'Facturas', icon: FileText },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'ai', label: 'IA Assistant', icon: MessageSquareText },
    { id: 'profile', label: 'Perfil', icon: UserIcon },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await addTransaction(user.uid, {
      ...newTx,
      date: new Date().toISOString()
    });
    setIsModalOpen(false);
    setNewTx({ description: '', amount: 0, category: 'Otros', type: 'expense' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-800 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card p-10 text-center space-y-8">
          <div className="w-32 h-32 mx-auto">
            <Logo className="w-full h-full" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Financiera Nova</h1>
            <p className="text-zinc-500">Tu asistente financiero inteligente para impulsar tu futuro.</p>
          </div>
          <button 
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-zinc-200 rounded-2xl font-bold text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
            Continuar con Google
          </button>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Seguridad Bancaria • Encriptación AES-256</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <Logo className="w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Financiera Nova</h1>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "bg-red-50 text-red-800" 
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <p className="text-xs text-zinc-500 mb-2">Presupuesto Mensual</p>
          <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-red-800 w-[65%]" />
          </div>
          <p className="text-xs font-semibold mt-2 text-zinc-700">65% gastado</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 md:hidden">
            <Logo className="w-8 h-8" />
          </div>
          
          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar transacciones..." 
                className="w-full pl-10 pr-4 py-2 bg-zinc-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-red-800 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsPopover onTabChange={setActiveTab} />
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm shadow-red-200"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Gasto</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'loans' && <Loans />}
              {activeTab === 'transactions' && <Transactions />}
              {activeTab === 'savings' && <Savings />}
              {activeTab === 'inventory' && <Inventory />}
              {activeTab === 'billing' && <Billing />}
              {activeTab === 'agenda' && <Agenda />}
              {activeTab === 'ai' && <AIChat />}
              {activeTab === 'profile' && <Profile />}
              {activeTab === 'admin' && <AdminPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t border-zinc-200 flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-1 transition-all",
              activeTab === item.id ? "text-red-800" : "text-zinc-400"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* New Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zinc-900">Nuevo Movimiento</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex p-1 bg-zinc-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setNewTx({...newTx, type: 'expense'})}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                    newTx.type === 'expense' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                  )}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setNewTx({...newTx, type: 'income'})}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                    newTx.type === 'income' ? "bg-white text-red-800 shadow-sm" : "text-zinc-500"
                  )}
                >
                  Ingreso
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Descripción</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Cena con amigos"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newTx.description}
                  onChange={e => setNewTx({...newTx, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Monto ($)</label>
                <input 
                  type="number" 
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newTx.amount || ''}
                  onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Categoría</label>
                <select
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none appearance-none"
                  value={newTx.category}
                  onChange={e => setNewTx({...newTx, category: e.target.value as Category})}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-red-800 hover:bg-red-900 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-100 mt-4"
              >
                Guardar Movimiento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




