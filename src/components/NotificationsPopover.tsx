import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Boxes, 
  FileText, 
  Award, 
  Flame,
  Zap,
  RotateCcw,
  Plus
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';

interface NotificationItem {
  id: string;
  type: 'challenge' | 'milestone' | 'info' | 'alert';
  title: string;
  message: string;
  isRead: boolean;
  date: string;
  progress?: number; // percentage (0 to 100)
  reward?: string; // Reward description (badge/achievement)
  actionLabel?: string;
  actionTab?: string;
  isCompleted?: boolean;
}

interface NotificationsPopoverProps {
  onTabChange: (tab: any) => void;
}

export default function NotificationsPopover({ onTabChange }: NotificationsPopoverProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load notifications or set defaults tailored to the user's Nova experience
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('nova_notifications');
    if (saved) return JSON.parse(saved);

    return [
      {
        id: 'challenge-1',
        type: 'challenge',
        title: 'Reto: Auditor de Activos',
        message: 'Registra un activo en tu Inventario (Inmuebles, Vehículos o Tecnología) para calcular con exactitud tu capital de negocios real.',
        isRead: false,
        date: 'Hoy',
        progress: 0,
        reward: 'Insignia de Planeación Nova',
        actionLabel: 'Ir a Inventario',
        actionTab: 'inventory',
        isCompleted: false
      },
      {
        id: 'challenge-2',
        type: 'challenge',
        title: 'Reto: Facturador Impecable',
        message: 'Personaliza los datos de tu empresa y emite tu primera factura comercial editable para habilitar cobros transparentes.',
        isRead: false,
        date: 'Ayer',
        progress: 0,
        reward: 'Insignia de Profesionalismo',
        actionLabel: 'Ir a Facturas',
        actionTab: 'billing',
        isCompleted: false
      },
      {
        id: 'milestone-1',
        type: 'milestone',
        title: 'Meta de Ahorros Recurrentes',
        message: 'Configura un objetivo de ahorro mensual de al menos RD$ 5,000 en el panel de cuentas para constituir un fondo firme de caja.',
        isRead: false,
        date: 'Hace 2 días',
        progress: 40,
        reward: 'Medalla de Previsión Financiera',
        actionLabel: 'Ir a Ahorros',
        actionTab: 'savings',
        isCompleted: false
      },
      {
        id: 'info-1',
        type: 'info',
        title: '¡Nueva Agenda Disponible!',
        message: 'Descubre el nuevo panel de Agenda donde programar citas, tasaciones, cobros a clientes y apuntar notas rápidas adhesivas.',
        isRead: true,
        date: 'Hace 3 días',
        actionLabel: 'Ver Agenda',
        actionTab: 'agenda',
        isCompleted: false
      }
    ];
  });

  // Calculate points and status
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const completedCount = notifications.filter(n => n.isCompleted).length;
  const totalXP = completedCount * 120; // 120 XP for every completed challenge

  // Persist notifications to local storage
  useEffect(() => {
    localStorage.setItem('nova_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    // When opening, we don't automatically mark all as read, we let them click or do it voluntarily
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // Mark as read
    setNotifications(notifications.map(n => n.id === item.id ? { ...n, isRead: true } : n));
    
    // Switch tab if configured
    if (item.actionTab) {
      onTabChange(item.actionTab);
    }
    setIsOpen(false);
  };

  const handleCompleteChallenge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering tab change on complete
    setNotifications(notifications.map(n => {
      if (n.id === id) {
        return { 
          ...n, 
          isCompleted: !n.isCompleted, 
          progress: n.isCompleted ? 0 : 100,
          isRead: true 
        };
      }
      return n;
    }));
  };

  // Add a personalized user challenge on demand
  const triggerCustomChallenge = () => {
    const challengePool = [
      {
        id: 'custom-' + Date.now(),
        type: 'challenge' as const,
        title: 'Reto: Cero Gastos Ocio',
        message: 'Ponte a prueba: intenta pasar los próximos 4 días sin registrar transacciones en el sector "Ocio" o "Otros".',
        isRead: false,
        date: 'Ahora mismo',
        progress: 0,
        reward: 'Insignia de Auto-disciplina Nova',
        actionLabel: 'Ver Dashboard',
        actionTab: 'dashboard',
        isCompleted: false
      },
      {
        id: 'custom-' + Date.now(),
        type: 'challenge' as const,
        title: 'Reto: Balance Positivo de Caja',
        message: 'Logra un superávit este mes. Registra ingresos totales que dupliquen a tus egresos o gastos registrados.',
        isRead: false,
        date: 'Ahora mismo',
        progress: 0,
        reward: 'Insignia de Superávit',
        actionLabel: 'Ver Transacciones',
        actionTab: 'transactions',
        isCompleted: false
      },
      {
        id: 'custom-' + Date.now(),
        type: 'challenge' as const,
        title: 'Reto: Liquidez Inmobiliaria',
        message: 'Registra un nuevo bien con un valor mayor a RD$ 100,000 para expandir el inventario patrimonial.',
        isRead: false,
        date: 'Ahora mismo',
        progress: 0,
        reward: 'Medalla de Capital Fijo',
        actionLabel: 'Ir a Inventario',
        actionTab: 'inventory',
        isCompleted: false
      },
      {
        id: 'custom-' + Date.now(),
        type: 'challenge' as const,
        title: 'Reto: Planificación de Pagos',
        message: 'Ingresa al menos 2 eventos de tipo "Recordatorio de Cobro" en tu Agenda para garantizar rentabilidad.',
        isRead: false,
        date: 'Ahora mismo',
        progress: 0,
        reward: 'Insignia de Gestión Segura',
        actionLabel: 'Ir a Agenda',
        actionTab: 'agenda',
        isCompleted: false
      }
    ];

    const randomChallenge = challengePool[Math.floor(Math.random() * challengePool.length)];
    setNotifications([randomChallenge, ...notifications]);
  };

  const resetAllNotifications = () => {
    localStorage.removeItem('nova_notifications');
    // Reload defaults
    window.location.reload();
  };

  return (
    <div className="relative" ref={containerRef} id="notifications-popover-container">
      {/* Bell Trigger Button */}
      <button 
        onClick={handleToggle}
        className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-full relative transition-all"
        id="bell-icon-trigger"
        title="Ver notificaciones y retos de capital"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-red-800 text-white rounded-full text-[8.5px] font-black leading-none border border-white flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-zinc-150 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-zinc-100 animate-slide-up">
          
          {/* Popover Header */}
          <div className="p-4 bg-gradient-to-r from-red-800 to-red-950 text-white flex justify-between items-center">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Retos y Desafíos Nova
              </h4>
              <p className="text-[10px] text-zinc-200">
                Puntaje de Ahorro: <span className="font-bold text-amber-300">{totalXP} XP</span> • {completedCount} Retos logrados
              </p>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-white/80 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions Bar */}
          <div className="bg-zinc-50 px-4 py-2 flex justify-between items-center text-[10px] font-bold">
            <button 
              onClick={triggerCustomChallenge} 
              className="text-red-800 hover:text-red-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Solicitar Nuevo Reto
            </button>
            <div className="flex gap-2">
              <button 
                onClick={markAllAsRead} 
                className="text-zinc-500 hover:text-zinc-700"
              >
                Marcar todo leído
              </button>
              <button 
                onClick={resetAllNotifications}
                className="text-zinc-400 hover:text-red-800 flex items-center gap-0.5"
                title="Reiniciar retos iniciales"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* List of Challenges / Alerts */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs">
                No hay notificaciones ni retos configurados. ¡Felicidades, estás al día!
              </div>
            ) : (
              notifications.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    "p-4 hover:bg-zinc-50 transition-all cursor-pointer relative flex flex-col gap-2.5",
                    !item.isRead && "bg-amber-50/20 hover:bg-amber-50/40",
                    item.isCompleted && "bg-green-50/20 opacity-80"
                  )}
                >
                  {/* Status Indicator Dot */}
                  {!item.isRead && (
                    <span className="absolute top-4 left-2.5 w-1.5 h-1.5 bg-red-800 rounded-full" />
                  )}

                  <div className="flex justify-between items-start pl-1.5">
                    <div className="space-y-0.5 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                          item.type === 'challenge' && "bg-red-100 text-red-800",
                          item.type === 'milestone' && "bg-amber-100 text-amber-800",
                          item.type === 'info' && "bg-blue-100 text-blue-800",
                          item.type === 'alert' && "bg-red-50 text-red-700"
                        )}>
                          {item.type === 'challenge' ? 'Desafío' : item.type === 'milestone' ? 'Objetivo' : item.type === 'info' ? 'Novedad' : 'Alerta'}
                        </span>
                        
                        <span className="text-[9px] text-zinc-400 font-medium">{item.date}</span>
                      </div>

                      <h5 className={cn(
                        "text-xs font-black text-zinc-900 mt-1",
                        item.isCompleted && "line-through text-zinc-500"
                      )}>
                        {item.title}
                      </h5>
                    </div>

                    {/* Completion Action */}
                    {item.type === 'challenge' && (
                      <button
                        onClick={(e) => handleCompleteChallenge(item.id, e)}
                        className={cn(
                          "p-1.5 rounded-lg border transition-all flex items-center justify-center",
                          item.isCompleted 
                            ? "bg-green-100 border-green-300 text-green-800" 
                            : "bg-white border-zinc-200 text-zinc-400 hover:text-green-700 hover:border-green-300 hover:bg-green-50"
                        )}
                        title={item.isCompleted ? "Reto Completado" : "Marcar como logrado"}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-normal pl-1.5">
                    {item.message}
                  </p>

                  {/* Progress bar */}
                  {item.progress !== undefined && !item.isCompleted && (
                    <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden ml-1.5">
                      <div 
                        className="bg-amber-500 h-full transition-all" 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                  )}

                  {/* Rewards Indicator */}
                  {item.reward && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded-xl w-fit ml-1.5 font-bold border border-amber-100/40">
                      <Award className="w-3.5 h-3.5 text-amber-700" />
                      <span>Recompensa: {item.reward} (+120 XP)</span>
                    </div>
                  )}

                  {/* Action Link Text */}
                  {item.actionLabel && (
                    <span className="text-[10px] text-red-800 hover:text-red-950 font-black pl-1.5 mt-0.5 flex items-center gap-0.5">
                      {item.actionLabel} &rarr;
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer of popover */}
          <div className="p-3 bg-zinc-50 text-center">
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
              Ecosistema Financiera Nova • Crece más rápido
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
