import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  CreditCard, 
  LogOut,
  ChevronRight,
  Target,
  Zap
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { logout } from '../firebase';
import { useAuth } from '../AuthContext';

export default function Profile() {
  const { profile } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 bg-red-800 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-red-100">
            {profile?.displayName?.substring(0, 2).toUpperCase() || 'UN'}
          </div>
          <button className="absolute -bottom-2 -right-2 p-2 bg-white border border-zinc-200 rounded-xl shadow-sm hover:bg-zinc-50 transition-all">
            <Settings className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{profile?.displayName}</h2>
          <p className="text-zinc-500">{profile?.email}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-1 bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider rounded-md">Plan Premium</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-md">Usuario Verificado</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Financial Settings */}
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-800" />
            Configuración Financiera
          </h3>
          <div className="glass-card divide-y divide-zinc-100">
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-zinc-900">Presupuesto Mensual</p>
                  <p className="text-xs text-zinc-500">Límite de gasto recomendado.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-800">{formatCurrency(100000)}</p>
                  <button className="text-[10px] font-bold text-zinc-400 hover:text-red-800 uppercase">Editar</button>
                </div>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-800 w-[65%]" />
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-800 rounded-lg">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Ahorro Automático</p>
                  <p className="text-xs text-zinc-500">Activa el redondeo y reglas.</p>
                </div>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-red-800">
                <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition" />
              </div>
            </div>
          </div>
        </div>

        {/* App Settings */}
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-800" />
            Ajustes de la App
          </h3>
          <div className="glass-card divide-y divide-zinc-100">
            {[
              { icon: Bell, label: 'Notificaciones', sub: 'Alertas de gasto y ahorro' },
              { icon: Shield, label: 'Seguridad', sub: 'PIN, Biometría y Privacidad' },
              { icon: CreditCard, label: 'Cuentas Conectadas', sub: 'Gestiona tus bancos' },
            ].map((item, i) => (
              <button key={i} className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition-all first:rounded-t-2xl last:rounded-b-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 text-zinc-600 rounded-lg">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-900">{item.label}</p>
                    <p className="text-xs text-zinc-500">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
