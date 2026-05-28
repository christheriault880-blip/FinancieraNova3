import React, { useState } from 'react';
import { Phone, LogOut, Mail, Lock, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { isPhoneRegistered, registerUserPhone } from '../services/firestoreService';
import { logout } from '../firebase';
import { motion } from 'motion/react';

export function PhoneRegistrationView() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Simple validation: numbers and length
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 8) {
      setError('Por favor, introduce un número de teléfono válido (mínimo 8 dígitos).');
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error('No hay una sesión de usuario activa.');
      
      // Check phone uniqueness
      const isRegistered = await isPhoneRegistered(phoneNumber);
      if (isRegistered) {
        setError('⚠️ Este número telefónico ya está registrado con otra cuenta. Para evitar múltiples pruebas gratuitas, se limita el sistema a una cuenta por número telefónico.');
        setLoading(false);
        return;
      }

      // Complete registration and start 30d trial
      await registerUserPhone(user.uid, user.email || '', phoneNumber);
    } catch (err: any) {
      console.error(err);
      setError('Ocurrió un error al procesar el registro: ' + (err.message || 'Servicio no disponible.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white border border-zinc-200 p-6 sm:p-10 rounded-3xl shadow-xl space-y-6 text-center"
      >
        <div className="w-16 h-16 bg-red-50 text-red-800 mx-auto rounded-2xl flex items-center justify-center shadow-md">
          <Phone className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Registro de Teléfono Obligatorio</h1>
          <p className="text-zinc-500 text-xs">
            ¡De parte de Financiera Nova te damos la bienvenida! Para darte acceso completo a la aplicación y activar tu <strong>prueba gratuita de 30 días</strong>, por favor introduce tu número de teléfono.
          </p>
        </div>

        <div className="bg-amber-50 text-amber-900 p-3 rounded-2xl text-[11px] font-medium text-left leading-relaxed">
          🔒 <strong>Protección contra abusos:</strong> Limitemos una sola prueba gratuita por número telefónico registrado para mantener el servicio seguro y profesional para todos nuestros afiliados.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block ml-1">Teléfono Móvil (Obligatorio)</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="tel"
                required
                disabled={loading}
                placeholder="Ej: +506 8888 8888 o 88888888"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 focus:bg-white rounded-2xl text-xs font-semibold outline-none focus:ring-1 focus:ring-red-800 transition-all text-zinc-800"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-800 hover:bg-red-900 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-red-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Activar Prueba Gratis & Acceso'
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-100">
          <button
            onClick={() => logout()}
            className="text-xs font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 mx-auto transition-colors focus:outline-none"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión actual
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function SubscriptionExpiredView() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white border border-rose-100 p-6 sm:p-10 rounded-3xl shadow-xl space-y-6 text-center"
      >
        <div className="w-16 h-16 bg-red-100 text-red-800 mx-auto rounded-2xl flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-rose-950 tracking-tight">Acceso Bloqueado</h1>
          <p className="text-rose-800 font-bold text-sm bg-rose-50 px-4 py-2 rounded-2xl inline-block">
            “Tu suscripción ha vencido, contacta al administrador.”
          </p>
        </div>

        <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-2xl text-left space-y-2 text-xs text-zinc-700">
          <div className="flex justify-between border-b border-zinc-200/55 pb-1">
            <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Usuario:</span>
            <span className="font-semibold text-zinc-850">{profile?.displayName}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200/55 pb-1">
            <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Correo:</span>
            <span className="font-semibold text-zinc-850">{profile?.email}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200/55 pb-1">
            <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Teléfono:</span>
            <span className="font-semibold text-zinc-850">{profile?.phone || 'No registrado'}</span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Vencimiento:</span>
            <span className="font-semibold text-red-600 font-mono">{profile?.subscriptionEnd}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <a
            href="mailto:christheriault880@gmail.com?subject=Suscripcion%20Vencida%20-%20Financiera%20Nova"
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Mail className="w-4 h-4" />
            Contactar al Administrador
          </a>

          <button
            onClick={() => logout()}
            className="w-full py-3 bg-white border border-zinc-250 text-zinc-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all"
          >
            <LogOut className="w-4 h-4 text-zinc-400" />
            Acceder con otra cuenta
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function SubscriptionSuspendedView() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white border border-rose-100 p-6 sm:p-10 rounded-3xl shadow-xl space-y-6 text-center"
      >
        <div className="w-16 h-16 bg-amber-100 text-amber-800 mx-auto rounded-2xl flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-amber-950 tracking-tight">Cuenta Suspendida</h1>
          <p className="text-amber-800 font-bold text-sm bg-amber-50 px-4 py-2 rounded-2xl inline-block">
            “Tu cuenta ha sido suspendida, contacta al administrador.”
          </p>
        </div>

        <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-2xl text-left space-y-2 text-xs text-zinc-700">
          <div className="flex justify-between border-b border-zinc-200/55 pb-1">
            <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Usuario:</span>
            <span className="font-semibold text-zinc-850">{profile?.displayName}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200/55 pb-1">
            <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Correo:</span>
            <span className="font-semibold text-zinc-850">{profile?.email}</span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Teléfono:</span>
            <span className="font-semibold text-zinc-850">{profile?.phone || 'No registrado'}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <a
            href="mailto:christheriault880@gmail.com?subject=Cuenta%20Suspendida%20-%20Financiera%20Nova"
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Mail className="w-4 h-4" />
            Contactar Soporte
          </a>

          <button
            onClick={() => logout()}
            className="w-full py-3 bg-white border border-zinc-250 text-zinc-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all"
          >
            <LogOut className="w-4 h-4 text-zinc-400" />
            Acceder con otra cuenta
          </button>
        </div>
      </motion.div>
    </div>
  );
}
