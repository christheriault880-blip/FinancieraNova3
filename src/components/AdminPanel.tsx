import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Database, 
  AlertTriangle, 
  Lock, 
  CheckCircle2, 
  Download, 
  Globe, 
  Search, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  Ban, 
  ChevronRight,
  UserCheck, 
  RefreshCw,
  Phone,
  Trash2
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { formatCurrency } from '../lib/utils';
import { 
  getAllUserProfiles, 
  updateUserProfileByAdmin, 
  releaseRegisteredPhone 
} from '../services/firestoreService';
import { UserProfile } from '../types';

export default function AdminPanel() {
  const { transactions, profile } = useAuth();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState('');
  
  // Tab System
  const [activeTab, setActiveTab] = useState<'users' | 'deployment' | 'settings'>('users');

  // SaaS User Data State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: 'success' });

  // Custom date state for manually editing date
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === 'nova') {
      setIsAuthorized(true);
      setError('');
    } else {
      setError('Contraseña incorrecta. Intenta con "nova"');
    }
  };

  // Fetch all users
  const loadUsersSyncSnapshot = async () => {
    setLoadingUsers(true);
    try {
      const users = await getAllUserProfiles();
      setUsersList(users);
    } catch (err) {
      console.error("Error loading users for admin view:", err);
      showFeedback('No se pudieron obtener los usuarios de Firestore.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadUsersSyncSnapshot();
    }
  }, [isAuthorized]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg({ text: '', type: 'success' });
    }, 4000);
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'activa' | 'vencida' | 'suspendida') => {
    try {
      const updates: Partial<UserProfile> = { subscriptionStatus: newStatus };
      
      // If activating, and subscription has expired or missing, set to 30 days trial
      const targetUser = usersList.find(u => u.uid === userId);
      const isExpired = targetUser?.subscriptionEnd && targetUser.subscriptionEnd < new Date().toISOString().split('T')[0];
      
      if (newStatus === 'activa' && (!targetUser?.subscriptionEnd || isExpired)) {
        const tomorrow30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        updates.subscriptionEnd = tomorrow30;
      }

      await updateUserProfileByAdmin(userId, updates);
      showFeedback(`Cuenta actualizada a estado: "${newStatus}" con éxito.`);
      loadUsersSyncSnapshot();
      
      if (selectedUser && selectedUser.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      showFeedback('Error al actualizar el estado.', 'error');
    }
  };

  const handleExtendDays = async (userId: string, days: number) => {
    const targetUser = usersList.find(u => u.uid === userId);
    if (!targetUser) return;

    try {
      const baseDate = targetUser.subscriptionEnd && targetUser.subscriptionEnd >= new Date().toISOString().split('T')[0]
        ? new Date(targetUser.subscriptionEnd)
        : new Date();
      
      // Ensure local noon timezone to prevent timezone slips
      baseDate.setHours(12, 0, 0, 0);
      const updatedDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const updates: Partial<UserProfile> = {
        subscriptionEnd: updatedDate,
        subscriptionStatus: 'activa' // Auto-reactivate
      };

      await updateUserProfileByAdmin(userId, updates);
      showFeedback(`Suscripción extendida +${days} días (Vence el ${updatedDate}).`);
      loadUsersSyncSnapshot();
      
      if (selectedUser && selectedUser.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      showFeedback('Error al extender la suscripción.', 'error');
    }
  };

  const handleCustomExpiry = async (userId: string) => {
    if (!customExpiryDate) {
      showFeedback('Por favor, selecciona una fecha válida.', 'error');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const isPast = customExpiryDate < today;
      const computedStatus = isPast ? 'vencida' : 'activa';

      const updates: Partial<UserProfile> = {
        subscriptionEnd: customExpiryDate,
        subscriptionStatus: computedStatus
      };

      await updateUserProfileByAdmin(userId, updates);
      showFeedback(`Suscripción asignada al ${customExpiryDate} (${computedStatus}).`);
      loadUsersSyncSnapshot();
      
      if (selectedUser && selectedUser.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      showFeedback('Error al asignar vencimiento custom.', 'error');
    }
  };

  const handleReleasePhone = async (phone: string, userId: string) => {
    if (!confirm(`¿Estás seguro de que quieres liberar el número ${phone}? El usuario se quedará sin teléfono y perderá acceso hasta registrar otro.`)) {
      return;
    }

    try {
      // 1. Release in registered_phones
      await releaseRegisteredPhone(phone);
      // 2. Clear on user profile
      await updateUserProfileByAdmin(userId, { phone: undefined });
      
      showFeedback('Número de teléfono liberado con éxito. El usuario podrá re-registrar su cuenta.');
      loadUsersSyncSnapshot();
      if (selectedUser && selectedUser.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, phone: undefined } : null);
      }
    } catch (err) {
      showFeedback('Error al liberar número telefónico.', 'error');
    }
  };

  // Search filter
  const filteredUsers = usersList.filter(u => {
    const rawSearch = searchTerm.toLowerCase();
    const mail = (u.email || '').toLowerCase();
    const name = (u.displayName || '').toLowerCase();
    const phoneNum = (u.phone || '').toLowerCase();
    return mail.includes(rawSearch) || name.includes(rawSearch) || phoneNum.includes(rawSearch);
  });

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl animate-pulse">
          <Lock className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Restringido</h2>
          <p className="text-slate-500 text-xs">Introduce la contraseña de administrador "nova" para continuar en el panel SaaS.</p>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <input 
            type="password" 
            placeholder="Introduce contraseña admin..."
            className="w-full px-4 py-3 bg-white border border-slate-200 focus:bg-zinc-50 rounded-2xl text-xs font-semibold focus:ring-1 focus:ring-slate-900 outline-none transition-all text-zinc-850"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
          <button 
            type="submit"
            className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md"
          >
            Validar & Ingresar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-800" />
            SaaS Admin Control
          </h2>
          <p className="text-zinc-500 text-xs font-medium">Gestión exclusiva de suscripciones, licenciamiento y prevención de fraude por teléfono.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadUsersSyncSnapshot}
            disabled={loadingUsers}
            className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition-all disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
          </button>
          <span className="px-3.5 py-1.5 bg-red-100 text-red-800 text-[10px] font-black rounded-xl uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conectado a Firestore
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'users' 
              ? 'border-red-850 text-red-800' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Suscripciones & Usuarios ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('deployment')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'deployment' 
              ? 'border-red-850 text-red-800' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Descargas & Despliegue (InfinityFree/Local)
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'settings' 
              ? 'border-red-850 text-red-800' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Ajustes de Servidor
        </button>
      </div>

      {feedbackMsg.text && (
        <div className={`p-3 text-xs font-bold rounded-xl text-center shadow-sm border ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {feedbackMsg.text}
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Users Column */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por email, teléfono o nombre..."
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 focus:bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-850 transition-all font-semibold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loadingUsers ? (
              <div className="py-12 text-center text-xs text-zinc-500 font-bold flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-red-850" />
                Cargando registros...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 font-bold">
                No se encontraron usuarios registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-600">
                  <thead className="bg-zinc-50 uppercase tracking-widest text-[9px] text-zinc-400 font-black border-b border-zinc-200">
                    <tr>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Teléfono</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4">Expiración</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-800">
                    {filteredUsers.map((u) => {
                      const today = new Date().toISOString().split('T')[0];
                      const isOver = u.subscriptionEnd && u.subscriptionEnd < today;
                      
                      return (
                        <tr 
                          key={u.uid} 
                          className={`hover:bg-zinc-50 cursor-pointer transition-colors ${
                            selectedUser?.uid === u.uid ? 'bg-red-50/20' : ''
                          }`}
                          onClick={() => {
                            setSelectedUser(u);
                            setCustomExpiryDate(u.subscriptionEnd || '');
                          }}
                        >
                          <td className="py-3 px-4 max-w-[170px] truncate">
                            <div className="font-bold text-zinc-900">{u.displayName || 'Usuario'}</div>
                            <div className="text-[10px] text-zinc-400 font-mono font-medium">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 font-mono select-all">
                            {u.phone ? (
                              <span className="flex items-center gap-1 text-zinc-800">
                                <Phone className="w-3 h-3 text-zinc-400" />
                                {u.phone}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic font-normal">No completado</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {u.subscriptionStatus === 'suspendida' ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                Suspendida
                              </span>
                            ) : isOver || u.subscriptionStatus === 'vencida' ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-900 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                Vencida / Expired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                Activa
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                            {u.subscriptionEnd ? (
                              <span className={isOver ? 'text-rose-600' : 'text-emerald-800'}>
                                {u.subscriptionEnd}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic font-normal">Prueba no iniciada</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition"
                              onClick={() => {
                                setSelectedUser(u);
                                setCustomExpiryDate(u.subscriptionEnd || '');
                              }}
                            >
                              Gestionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Action Overlay Section Panel */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 space-y-6 shadow-sm">
            {selectedUser ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-2">
                    Gestionar Afiliación
                  </h4>
                  <div className="mt-3 space-y-1.5 text-xs text-zinc-600">
                    <p><strong className="text-zinc-400">Usuario:</strong> {selectedUser.displayName || 'No asignado'}</p>
                    <p><strong className="text-zinc-400">Email:</strong> {selectedUser.email}</p>
                    <p><strong className="text-zinc-400">Teléfono:</strong> {selectedUser.phone || 'No registrado'}</p>
                    <p><strong className="text-zinc-400">UUID:</strong> <code className="bg-zinc-100 px-1 py-0.5 rounded text-[9px] font-mono">{selectedUser.uid}</code></p>
                  </div>
                </div>

                {/* Change Status */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black hover:text-zinc-450 uppercase tracking-widest text-zinc-400 block pb-1">
                    Cambiar Estado
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedUser.uid, 'activa')}
                      className={`py-2 text-[10px] font-bold rounded-xl border text-center transition-all ${
                        selectedUser.subscriptionStatus === 'activa'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                          : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      Activar
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedUser.uid, 'vencida')}
                      className={`py-2 text-[10px] font-bold rounded-xl border text-center transition-all ${
                        selectedUser.subscriptionStatus === 'vencida'
                          ? 'bg-red-50 border-red-300 text-red-850'
                          : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      Vencer
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedUser.uid, 'suspendida')}
                      className={`py-2 text-[10px] font-bold rounded-xl border text-center transition-all ${
                        selectedUser.subscriptionStatus === 'suspendida'
                          ? 'bg-amber-50 border-amber-350 text-amber-900'
                          : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      Suspender
                    </button>
                  </div>
                </div>

                {/* Extend Subscription */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                    Extender Tiempo Manualmente
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExtendDays(selectedUser.uid, 7)}
                      className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-bold transition"
                    >
                      +7 Días (1 Sem)
                    </button>
                    <button
                      onClick={() => handleExtendDays(selectedUser.uid, 30)}
                      className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-bold transition"
                    >
                      +30 Días (1 Mes)
                    </button>
                    <button
                      onClick={() => handleExtendDays(selectedUser.uid, 120)}
                      className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-bold transition"
                    >
                      +120 Días (4 Meses)
                    </button>
                    <button
                      onClick={() => handleExtendDays(selectedUser.uid, 365)}
                      className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-bold transition"
                    >
                      +365 Días (1 Año)
                    </button>
                  </div>
                </div>

                {/* Specific custom date picker */}
                <div className="space-y-1 pb-2 border-b border-zinc-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                    Vencimiento Exacto
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 px-3 py-2 border border-zinc-200 font-semibold focus:ring-1 focus:ring-zinc-900 outline-none rounded-xl text-xs font-mono"
                      value={customExpiryDate}
                      onChange={(e) => setCustomExpiryDate(e.target.value)}
                    />
                    <button
                      onClick={() => handleCustomExpiry(selectedUser.uid)}
                      className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-[10px] font-bold rounded-xl transition"
                    >
                      Asignar
                    </button>
                  </div>
                </div>

                {/* Prevent multi account - free trial releases */}
                {selectedUser.phone && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs space-y-2">
                    <p className="font-bold text-red-950 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-red-700" />
                      Liberar Teléfono
                    </p>
                    <p className="text-zinc-650 text-[11px] leading-relaxed">
                      Si el usuario necesita usar otro número telefónico o cambiar su cuenta, puedes liberar su teléfono actual ({selectedUser.phone}). Esto le permitirá volver a vincular la cuenta.
                    </p>
                    <button
                      onClick={() => handleReleasePhone(selectedUser.phone!, selectedUser.uid)}
                      className="w-full py-2 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-[10px] transition-all"
                    >
                      Liberar Registro Telefónico
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 space-y-2">
                <Users className="w-12 h-12 text-zinc-200" />
                <p className="text-xs font-bold">Selecciona un usuario de la lista para ver, administrar o activar su suscripción.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'deployment' && (
        <div className="grid grid-cols-1 gap-6">
          {/* Troubleshooting card */}
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-base font-bold text-amber-900">⚠️ ¿SIGUE APARECIENDO "SERVI MARKET" EN TU WEB?</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  ¡No te preocupes ni pases vergüenza! Esto <strong>no</strong> significa que el archivo que te descargas esté mal o que sea el viejo. Se debe a un comportamiento muy común de los navegadores y de <strong>InfinityFree</strong>. Aquí te explico exactamente por qué ocurre y cómo solucionarlo en 1 minuto:
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white p-4 rounded-2xl border border-amber-100 space-y-2 text-xs">
                <span className="font-bold text-amber-800 uppercase tracking-wider block">Causa 1: Caché de tu navegador</span>
                <p className="text-zinc-600 leading-relaxed text-[11px]">
                  Tu navegador web guarda copias pesadas de las páginas que ya has visitado para que carguen más rápido. Sigue cargando "Servi Market" desde el disco duro de tu computadora, no desde Internet.
                </p>
                <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                  ✔️ Solución: Abre una ventana de <strong>Incógnito / Privado</strong> en tu navegador e ingresa a tu link para ver el cambio real. O presiona <code className="bg-zinc-100 px-1 py-0.5 rounded">Ctrl + F5</code>.
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-100 space-y-2 text-xs">
                <span className="font-bold text-amber-800 uppercase tracking-wider block">Causa 2: Archivos prioritarios en InfinityFree</span>
                <p className="text-zinc-600 leading-relaxed text-[11px]">
                  El hosting gratuito de InfinityFree prioriza archivos con terminación <code>.php</code> o nombres de plantilla antes que tu nuevo <code>index.html</code>. Si aún existen allí, se cargarán primero.
                </p>
                <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                  ✔️ Solución: Entra a tu administrador de archivos en <strong>htdocs</strong> y borra archivos antiguos como <code>index.php</code>, <code>default.php</code> o <code>index2.html</code>.
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-100 space-y-2 text-xs">
                <span className="font-bold text-amber-800 uppercase tracking-wider block">Causa 3: Caché del Servidor de InfinityFree</span>
                <p className="text-zinc-600 leading-relaxed text-[11px]">
                  Los servidores de InfinityFree a veces tardan unos minutos (hasta 10-15 minutos) en refrescar los archivos nuevos que subes a su panel.
                </p>
                <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                  ✔️ Solución: Ten paciencia unos minutos o limpia las cookies y datos del sitio web en la configuración de Candado de la barra de navegación.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  1. Subir a InfinityFree (Web Online)
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Sigue estos pasos para que tu web funcione de inmediato en tu hosting gratuito:
                </p>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 space-y-2">
                  <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
                    <li>
                      <span className="text-zinc-900 font-medium">Descarga</span> el archivo <code>index.html</code> de abajo.
                    </li>
                    <li>
                      Abre el administrador de archivos en <strong>InfinityFree</strong> y entra a la carpeta <strong>htdocs</strong>.
                    </li>
                    <li>
                      <span className="text-zinc-900 font-medium">BORRA</span> cualquier archivo php viejo, especialmente <code>index.php</code> o <code>default.php</code> de Servi Market.
                    </li>
                    <li>
                      <span className="text-zinc-900 font-medium">Sube</span> el archivo <code>index.html</code> que descargues ahora. ¡Y listo!
                    </li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a 
                  href="/index.html"
                  download="index.html"
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-emerald-700 transition-all shadow-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>Descargar index.html</span>
                  </div>
                  <span className="text-[10px] opacity-90 font-normal">Archivo individual listo para htdocs</span>
                </a>
                <a 
                  href="/FINANCIERA_NOVA_LISTO.zip"
                  download="FINANCIERA_NOVA_LISTO.zip"
                  className="w-full py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all text-xs"
                >
                  <Download className="w-4 h-4 text-zinc-500" />
                  Descargar ZIP de Respaldo
                </a>
              </div>
            </div>

            <div className="glass-card p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-500" />
                  2. Copiar Localmente en XAMPP
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Sigue estos pasos para instalar y ejecutar Financiera Nova localmente en tu computadora:
                </p>
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 space-y-2">
                  <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
                    <li>
                      <span className="text-indigo-900 font-medium">Baja el ZIP</span> utilizando el botón azul de abajo.
                    </li>
                    <li>
                      Dirígete a tu directorio de XAMPP (por defecto <code>C:\xampp\htdocs\</code>).
                    </li>
                    <li>
                      Crea una carpeta llamada <strong className="text-indigo-950 font-bold">financiera_nova</strong> y descomprime el contenido del ZIP ahí (el archivo <code>index.html</code>).
                    </li>
                    <li>
                      Abre su Apache Control Panel local y cargue <code>http://localhost/financiera_nova/</code>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a 
                  href="/FINANCIERA_NOVA_XAMPP.zip"
                  download="FINANCIERA_NOVA_XAMPP.zip"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-indigo-700 transition-all shadow-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>Descargar para XAMPP (ZIP)</span>
                  </div>
                  <span className="text-[10px] opacity-90 font-normal">Compresor ZIP listo para htdocs local</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="glass-card p-6 space-y-6">
          <div>
            <h3 className="font-bold text-zinc-900 text-sm">Configuraciones de Servidor Críticas</h3>
            <p className="text-zinc-500 text-xs mt-1">Monitorea y modifique variables globales de servidor.</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-zinc-900">Mantenimiento Global</p>
                <p className="text-[10px] text-zinc-500">Muestra pantalla de "Sitio en mantenimiento" temporal a suscriptores.</p>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-200 cursor-pointer">
                <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white transition" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
