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
  Coins,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useAuth } from './AuthContext';
import { loginWithGoogle, registerWithEmail, loginWithEmail, resetPassword, sendVerification } from './firebase';
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
import PaymentReminders from './components/PaymentReminders';
import { BellRing } from 'lucide-react';

type Tab = 'dashboard' | 'transactions' | 'savings' | 'ai' | 'profile' | 'admin' | 'inventory' | 'billing' | 'agenda' | 'loans' | 'reminders';

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

  // Authentication states
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'Ocurrió un error al intentar iniciar sesión con Google.';
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('auth/unauthorized-domain')) {
          friendlyMessage = 'Este dominio no está autorizado para Google Sign-In aún. Por favor asegúrate de haber agregado tanto "localhost" como tu dominio de Vercel/Producción (por ejemplo: ' + window.location.hostname + ') en Firebase Console -> Authentication -> Settings -> Authorized domains.';
        } else if (msg.includes('auth/popup-closed-by-user')) {
          friendlyMessage = 'Se cerró la ventana emergente de Google. Inténtalo de nuevo.';
        } else if (msg.includes('auth/operation-not-allowed')) {
          friendlyMessage = 'El inicio de sesión de Google no está activo en tu proyecto de Firebase. Actívalo en la consola de Firebase -> Authentication -> Sign-in Method.';
        } else {
          friendlyMessage = `Error de Google Sign-In: ${msg}`;
        }
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      const cleanedEmail = authEmail.trim().toLowerCase();
      if (authMode === 'login') {
        const loggedUser = await loginWithEmail(cleanedEmail, authPassword);
        if (loggedUser && !loggedUser.emailVerified) {
          // Soft success info that they might want to verify, but we let them log in
          setAuthSuccess('¡Sesión iniciada! Nota: Tu correo electrónico no ha sido verificado aún. Revisa tu bandeja de entrada o haz clic en verificar correo en tu perfil.');
        }
      } else if (authMode === 'register') {
        if (!authUsername.trim()) {
          throw new Error('Por favor ingrese un nombre de usuario.');
        }
        if (authPassword.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres. Firebase no permite registrar contraseñas más cortas por seguridad.');
        }
        await registerWithEmail(cleanedEmail, authUsername.trim(), authPassword);
        setAuthSuccess('¡Cuenta registrada exitosamente! Se ha enviado un correo con un enlace de verificación a ' + cleanedEmail + '. Por favor, revise su correo.');
      } else if (authMode === 'forgot') {
        if (!cleanedEmail) {
          throw new Error('Por favor ingrese su correo electrónico.');
        }
        await resetPassword(cleanedEmail);
        setAuthSuccess('¡Enlace enviado! Hemos enviado un correo para restablecer tu contraseña a ' + cleanedEmail + '. IMPORTANTE: Si no lo ves en tu bandeja principal, por favor REVISA LA CARPETA DE CORREO NO DESEADO / SPAM. (Si te registraste con el botón de Google, el correo no llegará ya que accedes directamente sin contraseña).');
        setAuthMode('login');
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'Ocurrió un error inesperado al intentar realizar la operación.';
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
      if (msg) {
        if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
          friendlyMessage = 'Credenciales incorrectas o cuenta inexistente. Importante: Si te registraste usando "Acceder con Google", debes ingresar usando ese botón azul de abajo, ya que tu cuenta de Google no tiene una contraseña manual configurada.';
        } else if (msg.includes('auth/email-already-in-use')) {
          friendlyMessage = 'Este correo electrónico ya está registrado. Intente iniciar sesión o use "Olvidé mi contraseña".';
        } else if (msg.includes('auth/weak-password')) {
          friendlyMessage = 'La contraseña debe tener al menos 6 caracteres. Firebase requiere contraseñas de al menos 6 caracteres por seguridad.';
        } else if (msg.includes('auth/invalid-email')) {
          friendlyMessage = 'El formato de correo electrónico ingresado no es válido.';
        } else if (msg.includes('auth/operation-not-allowed')) {
          friendlyMessage = 'El registro con Correo/Contraseña está desactivado en tu proyecto Firebase. Actívalo en tu Firebase Console: ve a Authentication -> Sign-in Method -> Agregar nuevo proveedor -> selecciona "Correo electrónico/contraseña" y actívalo para que empiece a funcionar en la web.';
        } else if (msg.includes('auth/too-many-requests')) {
          friendlyMessage = 'Demasiados intentos de inicio de sesión fallidos. La cuenta ha sido bloqueada temporalmente. Por favor intenta de nuevo más tarde o restablece tu contraseña.';
        } else {
          friendlyMessage = msg;
        }
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'loans', label: 'Préstamos', icon: Coins },
    { id: 'transactions', label: 'Gastos', icon: ReceiptText },
    { id: 'savings', label: 'Ahorro', icon: Wallet },
    { id: 'inventory', label: 'Inventario', icon: Boxes },
    { id: 'billing', label: 'Facturas', icon: FileText },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'reminders', label: 'Recordatorios', icon: BellRing },
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 sm:p-6 select-none">
        <div className="max-w-md w-full glass-card p-6 sm:p-10 text-center space-y-6 bg-white border border-zinc-150 rounded-3xl shadow-xl">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto">
            <Logo className="w-full h-full" />
          </div>
          
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">Financiera Nova</h1>
            <p className="text-zinc-500 text-xs sm:text-sm">Tu asistente financiero inteligente para impulsar tu futuro.</p>
          </div>

          {/* Tab switches */}
          <div className="flex bg-zinc-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
                setAuthSuccess('');
              }}
              className={cn(
                "flex-1 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all",
                authMode === 'login' ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
                setAuthSuccess('');
              }}
              className={cn(
                "flex-1 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all",
                authMode === 'register' ? "bg-white text-red-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              Registrarse
            </button>
          </div>

          {authError && (
            <div className="flex items-start gap-2 text-left bg-red-50 border border-red-150 text-red-800 p-3.5 rounded-2xl text-[11px] font-semibold animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="flex items-start gap-2 text-left bg-emerald-50 border border-emerald-150 text-emerald-800 p-3.5 rounded-2xl text-[11px] font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{authSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'forgot' && (
              <div className="space-y-1.5 text-left border rounded-2xl p-4 bg-zinc-50 border-zinc-200">
                <span className="text-[10px] font-black text-red-800 uppercase tracking-widest block">Recuperar Acceso</span>
                <p className="text-[11px] text-zinc-500 font-medium">Ingrese su correo de registro y le enviaremos un enlace oficial de Firebase para restablecer su contraseña de inmediato.</p>
                <p className="text-[10px] text-amber-700 font-bold bg-amber-50 rounded-lg p-2 mt-1">
                  💡 NOTA: Los correos automáticos de Firebase a veces son filtrados y van directo a la carpeta de <strong>SPAM / CORREO NO DESEADO</strong>. ¡Búscalo allí si no lo ves en tu bandeja de entrada!
                </p>
              </div>
            )}

            {authMode === 'register' && (
              <div className="text-left space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block ml-1">Nombre de Usuario</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: chris_nova"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100/50 focus:bg-white rounded-2xl text-xs font-semibold outline-none focus:ring-1 focus:ring-red-800 transition-all text-zinc-800"
                  />
                </div>
              </div>
            )}

            <div className="text-left space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="usuario@financieranova.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100/50 focus:bg-white rounded-2xl text-xs font-semibold outline-none focus:ring-1 focus:ring-red-800 transition-all text-zinc-800"
                />
              </div>
            </div>

            {authMode !== 'forgot' && (
              <div className="text-left space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Contraseña</label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className="text-[10px] font-bold text-red-800 hover:underline transition-all"
                    >
                      ¿Olvidó su contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="******"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100/50 focus:bg-white rounded-2xl text-xs font-semibold outline-none focus:ring-1 focus:ring-red-800 transition-all text-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                {authMode === 'register' && (
                  <span className="text-[10px] text-zinc-500 font-bold block ml-1.5 mt-1">
                    * Mínimo 6 caracteres (Requerido por Firebase)
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-800 hover:bg-red-900 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-red-100 disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {authMode === 'login' ? 'Iniciar Sesión' : authMode === 'register' ? 'Crear Cuenta' : 'Recuperar Contraseña'}
                </>
              )}
            </button>

            {authMode === 'forgot' && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  &larr; Volver al Inicio de Sesión
                </button>
              </div>
            )}
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-150"></div>
            <span className="flex-shrink mx-4 text-[10px] text-zinc-450 font-extrabold uppercase tracking-widest">O continúa con</span>
            <div className="flex-grow border-t border-zinc-150"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-zinc-200 rounded-2xl font-bold text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm text-xs"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" referrerPolicy="no-referrer" />
            Acceder con Google
          </button>

          <div className="pt-2">
            <p className="text-[9px] text-zinc-450 uppercase tracking-widest font-black flex items-center justify-center gap-1.5">
              <span>Seguridad Bancaria • Encriptación AES-256</span>
            </p>
          </div>
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
              {activeTab === 'reminders' && <PaymentReminders />}
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




