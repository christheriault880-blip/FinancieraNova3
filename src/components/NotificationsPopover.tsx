import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  X, 
  RotateCcw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';

interface NotificationItem {
  id: string;
  type: 'info' | 'alert';
  title: string;
  message: string;
  isRead: boolean;
  date: string;
  actionLabel?: string;
  actionTab?: string;
}

interface NotificationsPopoverProps {
  onTabChange: (tab: any) => void;
}

export default function NotificationsPopover({ onTabChange }: NotificationsPopoverProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Load notifications from localStorage, filtering out challenge-related milestones/retos
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('nova_notifications');
    let parsed: any[] = saved ? JSON.parse(saved) : [];
    
    // Pristine filter to remove any mention of challenges, retos, or milestones
    parsed = parsed.filter(n => 
      n.type !== 'milestone' && 
      !n.title.toLowerCase().includes('reto') && 
      !n.message.toLowerCase().includes('reto') &&
      !n.title.toLowerCase().includes('desafío') && 
      !n.message.toLowerCase().includes('desafío')
    );
    return parsed;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Persist notifications list to localStorage
  useEffect(() => {
    localStorage.setItem('nova_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Hook to handle Escape key press for quick exit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent background scrolling when full screen popover is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
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

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const deleteSingleNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="relative" id="notifications-popover-container">
      {/* Bell Trigger Button */}
      <button 
        onClick={handleToggle}
        className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-full relative transition-all"
        id="bell-icon-trigger"
        title="Ver notificaciones y alertas"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-red-800 text-white rounded-full text-[8.5px] font-black leading-none border border-white flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
      {/* Full-Screen Immersive Drawer Overlay with 100% viewport coverage */}
      {isOpen && createPortal(
        <div className="fixed inset-0 bg-white z-[999999] flex flex-col w-full h-full overflow-hidden animate-fade-in text-zinc-800">
          
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-red-800 to-zinc-950 text-white py-5 shrink-0 border-b border-red-900 shadow-md">
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 flex justify-between items-center gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-900/60 rounded-xl shrink-0">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-red-200 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-white truncate">
                      Notificaciones y Alertas de Cartera
                    </h2>
                    <p className="text-[10px] sm:text-xs text-zinc-300 font-medium truncate sm:whitespace-normal">
                      Consulte el estado de vencimiento de sus préstamos próximos a cobrar, alertas en mora y recordatorios de pago.
                    </p>
                  </div>
                </div>
              </div>

              {/* EXIT BUTTON - BIG, RED, CONSTRAINED AND PERFECTLY DETECTABLE */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="bg-red-700 hover:bg-red-800 active:scale-95 text-white font-extrabold px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 shadow-lg border border-red-650 transition-all text-[10px] sm:text-xs cursor-pointer focus:outline-none shrink-0"
                title="Cerrar notificaciones y salir de la vista"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                <span className="font-black uppercase tracking-wider">CERRAR</span>
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-zinc-50 border-b border-zinc-200 py-3.5 shrink-0 shadow-sm">
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-bold text-zinc-700">
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] sm:text-[10px] bg-red-100 text-red-800 px-3 py-1 rounded-full uppercase tracking-wider font-extrabold animate-pulse">
                  {unreadCount} sin leer
                </span>
                <span className="text-zinc-300 font-medium">|</span>
                <span className="text-zinc-550 font-semibold">Total en buzón: {notifications.length}</span>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4">
                <button 
                  onClick={markAllAsRead} 
                  className="text-red-800 hover:text-red-950 transition-colors flex items-center gap-1 bg-red-50/50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-[10px] sm:text-xs"
                >
                  Marcar todo leído
                </button>
                <button 
                  onClick={clearAllNotifications}
                  className="text-zinc-505 hover:text-red-805 transition-colors flex items-center gap-1 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-150 text-[10px] sm:text-xs"
                  title="Eliminar todos los avisos permanentemente"
                >
                  <RotateCcw className="w-3 h-3" />
                  Vaciar buzón
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable notifications list - FULL SCREEN HEIGHT WORKSPACE */}
          <div className="flex-1 overflow-y-auto py-6 bg-zinc-50/35">
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-4 pb-20">
              {notifications.length === 0 ? (
                <div className="min-h-[40vh] flex flex-col items-center justify-center text-center space-y-4 p-6">
                  <div className="p-5 bg-zinc-100 text-zinc-400 rounded-full shadow-inner">
                    <Bell className="w-12 h-12 text-zinc-300" />
                  </div>
                  <div className="space-y-2 max-w-lg">
                    <h3 className="text-zinc-800 font-black text-xs sm:text-sm uppercase tracking-wider">Tu centro de alertas está vacío</h3>
                    <p className="text-zinc-500 text-xs leading-relaxed font-semibold">
                      No existen avisos o alertas urgentes en este momento. Las alertas para vencimientos de cobros de préstamos, clientes en mora y recordatorios de pago de servicios aparecerán automáticamente aquí para ayudarte a mantener el control.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {notifications.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={cn(
                        "p-5 sm:p-6 bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl hover:border-red-300 transition-all cursor-pointer relative flex flex-col gap-3 group/item shadow-sm hover:shadow-md",
                        !item.isRead && "border-l-4 border-l-red-800 bg-red-50/5"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1",
                              item.type === 'alert' ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-805"
                            )}>
                              {item.type === 'alert' ? (
                                <>
                                  <AlertTriangle className="w-2.5 h-2.5 text-red-650" />
                                  Alerta
                                </>
                              ) : (
                                <>
                                  <Info className="w-2.5 h-2.5 text-zinc-650" />
                                  Sistema
                                </>
                              )}
                            </span>
                            
                            <span className="text-[10px] text-zinc-450 font-bold">{item.date}</span>
                          </div>

                          <h5 className="text-xs sm:text-sm font-black text-zinc-900 mt-1 select-all">
                            {item.title}
                          </h5>
                        </div>

                        {/* Delete notification item */}
                        <button
                          onClick={(e) => deleteSingleNotification(item.id, e)}
                          className="p-1.5 opacity-0 group-hover/item:opacity-100 hover:bg-zinc-100 text-zinc-400 hover:text-red-800 rounded-lg transition-all focus:outline-none"
                          title="Eliminar aviso de la lista"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-zinc-600 leading-relaxed font-semibold pr-1 gap-1.5 select-all">
                        {item.message}
                      </p>

                      {/* Navigation/Action badge */}
                      {item.actionLabel && (
                        <div className="pt-2.5 border-t border-zinc-100 flex justify-between items-center text-[10px] font-bold text-zinc-500">
                          <span className="text-red-800 hover:text-red-950 font-black inline-flex items-center gap-1.5">
                            {item.actionLabel} &rarr;
                          </span>
                          {!item.isRead && (
                            <span className="text-[9px] text-zinc-400 italic font-medium">
                              Presiona para saltar directamente al módulo correspondiente
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-center shrink-0 select-none">
            <div className="max-w-5xl mx-auto w-full text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Financiera Nova • Transparencia y Control Total Automatizado
            </div>
          </div>

        </div>,
        document.body
      )}
    </div>
  );
}
