import { useState, useEffect } from 'react';
import { 
  Wifi, 
  Tv, 
  Home, 
  CreditCard, 
  Coins, 
  Plus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  Settings, 
  Bell, 
  Info, 
  Send,
  Zap,
  Globe,
  BellRing
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { sendPaymentReminderEmail, triggerBrowserNotification } from '../services/emailService';

export interface PaymentReminder {
  id: string;
  title: string;
  category: 'internet' | 'Netflix' | 'renta' | 'tarjetas' | 'préstamos' | 'otro';
  amount: number;
  dueDate: string; // YYYY-MM-DD
  emailNotification: boolean;
  completed: boolean;
  lastNotifiedOption?: string; // YYYY-MM-DD to avoid repeating
}

const CATEGORY_CONFIG = {
  internet: { label: 'Internet', icon: Wifi, color: 'bg-blue-50 text-blue-800 border-blue-150', iconColor: 'text-blue-700' },
  Netflix: { label: 'Netflix', icon: Tv, color: 'bg-red-50 text-red-800 border-red-150', iconColor: 'text-red-700' },
  renta: { label: 'Renta', icon: Home, color: 'bg-emerald-50 text-emerald-800 border-emerald-150', iconColor: 'text-emerald-700' },
  tarjetas: { label: 'Tarjetas de Crédito', icon: CreditCard, color: 'bg-amber-50 text-amber-800 border-amber-150', iconColor: 'text-amber-700' },
  préstamos: { label: 'Préstamos', icon: Coins, color: 'bg-purple-50 text-purple-800 border-purple-150', iconColor: 'text-purple-705' },
  otro: { label: 'Otro Pago', icon: Info, color: 'bg-zinc-50 text-zinc-800 border-zinc-150', iconColor: 'text-zinc-650' }
};

export default function PaymentReminders() {
  const { profile, isAdmin } = useAuth();
  const userEmail = profile?.email || 'admin@financieranova.com.do';
  const userName = profile?.displayName || 'Cliente de Financiera Nova';

  // State
  const [reminders, setReminders] = useState<PaymentReminder[]>(() => {
    const saved = localStorage.getItem('nova_payment_reminders');
    if (saved) return JSON.parse(saved);

    // Initial helpful templates as requested
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);
    const inFiveDaysStr = inFiveDays.toISOString().split('T')[0];

    return [
      {
        id: 'rem-1',
        title: 'Pago Mensual de Claro Internet',
        category: 'internet',
        amount: 2500,
        dueDate: tomorrowStr, // Due tomorrow, which triggers "Tu pago vence mañana"
        emailNotification: true,
        completed: false
      },
      {
        id: 'rem-2',
        title: 'Suscripción Netflix Familiar',
        category: 'Netflix',
        amount: 750,
        dueDate: inFiveDaysStr,
        emailNotification: true,
        completed: false
      },
      {
        id: 'rem-3',
        title: 'Alquiler Apartamento Naco',
        category: 'renta',
        amount: 35000,
        dueDate: '2026-06-01',
        emailNotification: true,
        completed: false
      },
      {
        id: 'rem-4',
        title: 'Tarjeta de Crédito BHD',
        category: 'tarjetas',
        amount: 15400,
        dueDate: '2026-06-05',
        emailNotification: true,
        completed: false
      },
      {
        id: 'rem-5',
        title: 'Cuota Préstamo de Vehículo',
        category: 'préstamos',
        amount: 12000,
        dueDate: '2026-06-10',
        emailNotification: true,
        completed: false
      }
    ];
  });

  // Setup / credentials Drawer Configs
  const [showConfig, setShowConfig] = useState(false);
  const [serviceId, setServiceId] = useState(() => localStorage.getItem('nova_emailjs_service_id') || '');
  const [templateId, setTemplateId] = useState(() => localStorage.getItem('nova_emailjs_template_id') || '');
  const [publicKey, setPublicKey] = useState(() => localStorage.getItem('nova_emailjs_public_key') || '');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PaymentReminder['category']>('internet');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [emailNotification, setEmailNotification] = useState(true);

  // Log status states
  const [logs, setLogs] = useState<string[]>([]);
  const [systemAlertMessage, setSystemAlertMessage] = useState<string | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('nova_payment_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Handle configuration edits
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('nova_emailjs_service_id', serviceId);
    localStorage.setItem('nova_emailjs_template_id', templateId);
    localStorage.setItem('nova_emailjs_public_key', publicKey);
    addLog(`⚙️ Configuración EmailJS guardada localmente.`);
    setShowConfig(false);
  };

  const addLog = (msg: string) => {
    setLogs(l => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l].slice(0, 15));
  };

  // Automated notification checker
  // Scans reminders, triggers alerts instantly for payments due tomorrow
  const checkPaymentDeadlines = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dueTomorrow = reminders.filter(r => !r.completed && r.dueDate === tomorrowStr);

    if (dueTomorrow.length > 0) {
      const titles = dueTomorrow.map(r => r.title).join(', ');
      const msg = `⚠️ ¡Tu pago de [${titles}] vence mañana! Te enviamos una alerta para evitar recargos.`;
      setSystemAlertMessage(msg);
      
      // Request permission and trigger browser notification
      await triggerBrowserNotification('¡Recordatorio: Tu pago vence mañana!', `Tu pago por "${titles}" está programado para vencer mañana. Evita atrasos.`);
      addLog(`🔔 Alerta en pantalla activada: "Tu pago vence mañana" para: ${titles}`);

      // Try sending automatic emails if configured & not sent yet
      for (const item of dueTomorrow) {
        // Add to NotificationsPopover list in localStorage so it appears in the top bell popover!
        try {
          const savedNotificationsStr = localStorage.getItem('nova_notifications');
          const list = savedNotificationsStr ? JSON.parse(savedNotificationsStr) : [];
          const exists = list.some((n: any) => n.id === `reminder-alert-${tomorrowStr}-${item.id}`);
          if (!exists) {
            const newAlert = {
              id: `reminder-alert-${tomorrowStr}-${item.id}`,
              type: 'alert' as const,
              title: '¡Pago vence mañana!',
              message: `Tu obligación de "${item.title}" por ${item.amount.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })} vence mañana (${item.dueDate}).`,
              isRead: false,
              date: 'Hoy',
              actionLabel: 'Ver Recordatorio',
              actionTab: 'reminders',
              isCompleted: false
            };
            localStorage.setItem('nova_notifications', JSON.stringify([newAlert, ...list]));
          }
        } catch (err) {
          console.warn("Could not insert reminder into popover list:", err);
        }

        if (item.emailNotification && item.lastNotifiedOption !== tomorrowStr) {
          addLog(`📨 Intentando enviar correo electrónico automático para: ${item.title}...`);
          try {
            const emailResult = await sendPaymentReminderEmail({
              to_email: userEmail,
              user_name: userName,
              payment_title: item.title,
              payment_category: item.category,
              payment_amount: item.amount,
              payment_due_date: item.dueDate
            });
            
            if (emailResult.success) {
              addLog(`✅ ¡Correo despachado con éxito! Destinatario: ${userEmail}`);
            } else {
              addLog(`ℹ️ Correo simulado/fallido: ${emailResult.message}`);
            }

            // Save notified check flag state
            setReminders(prev => prev.map(r => r.id === item.id ? { ...r, lastNotifiedOption: tomorrowStr } : r));

          } catch (e: any) {
            addLog(`❌ Error enviando mail: ${e.message}`);
          }
        }
      }
    } else {
      addLog('🔍 Comprobando recordatorios... No se detectaron pagos con vencimiento para mañana.');
    }
  };

  // Perform checks once when landing
  useEffect(() => {
    checkPaymentDeadlines();
  }, []);

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate || !amount) return;

    const newReminder: PaymentReminder = {
      id: 'rem-' + Date.now(),
      title,
      category,
      amount: Number(amount),
      dueDate,
      emailNotification,
      completed: false
    };

    setReminders([newReminder, ...reminders]);
    setIsFormOpen(false);

    // Reset Form
    setTitle('');
    setCategory('internet');
    setAmount('');
    setDueDate('');
    setEmailNotification(true);

    addLog(`➕ Recordatorio creado: "${newReminder.title}" para el ${newReminder.dueDate}.`);
  };

  const handleDeleteReminder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = reminders.find(r => r.id === id);
    if (!target) return;
    setReminders(reminders.filter(r => r.id !== id));
    addLog(`🗑️ Recordatorio eliminado: "${target.title}"`);
  };

  const handleToggleComplete = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
    const target = reminders.find(r => r.id === id);
    if (target) {
      addLog(`✅ Estado de pago cambiado para: "${target.title}" (${!target.completed ? 'PAGADO' : 'PENDIENTE'})`);
    }
  };

  // Manual trigger for testing right now
  const handleManualEmailTest = async (item: PaymentReminder, e: React.MouseEvent) => {
    e.stopPropagation();
    addLog(`📨 Disparando envío manual de correo de prueba a: ${userEmail}...`);
    
    const emailResult = await sendPaymentReminderEmail({
      to_email: userEmail,
      user_name: userName,
      payment_title: item.title,
      payment_category: item.category,
      payment_amount: item.amount,
      payment_due_date: item.dueDate
    });

    if (emailResult.success) {
      alert(`¡Éxito! Correo de recordatorio para "${item.title}" enviado satisfactoriamente a: ${userEmail}`);
      addLog(`✅ ¡Confirmación manual enviada con éxito a ${userEmail}!`);
    } else {
      alert(`Aviso: ${emailResult.message}\n\nHemos simulado el envío con éxito. Registra tus credenciales de EmailJS en la sección "Configurar EmailJS" arriba a la derecha para enviar correos de verdad mediante tu servidor de correo en producción.`);
      addLog(`ℹ️ Notificación manual completada: ${emailResult.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="reminders-main-section">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Recordatorios de Pagos</h2>
          <p className="text-zinc-500 text-xs sm:text-sm">
            Control de cuentas recurrentes: Internet, Netflix, Renta, Tarjetas o Préstamos. Reciba correos electrónicos de recordatorio cuando sus pagos estén cerca de vencer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-all"
              title="Configurar servidor de correo electrónico"
            >
              <Settings className="w-4 h-4 text-zinc-500" />
              Configurar EmailJS
            </button>
          )}

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-100"
          >
            <Plus className="w-4 h-4" />
            Nuevo Recordatorio
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {systemAlertMessage && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 animate-slide-up">
          <div className="p-2 bg-red-100 rounded-xl text-red-800">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-black text-red-950 uppercase tracking-wider">NOTIFICACIÓN SISTEMA NOVA</p>
            <p className="text-xs text-red-900 font-semibold">{systemAlertMessage}</p>
          </div>
          <button 
            onClick={() => setSystemAlertMessage(null)}
            className="text-xs font-bold text-red-800 hover:underline"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Configuration modal / drawer details */}
      {isAdmin && showConfig && (
        <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 animate-slide-up">
          <div className="flex justify-between items-start border-b border-zinc-200 pb-3">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-red-800" />
                Configurar Correo Electrónico Real de Alertas (EmailJS)
              </h4>
              <p className="text-[11px] text-zinc-500">
                Siga estos sencillos pasos para que el sistema envíe correos electrónicos reales directamente a su bandeja de entrada.
              </p>
            </div>
            <button onClick={() => setShowConfig(false)} className="text-zinc-500 hover:text-zinc-800 font-bold text-xs">Cerrar</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Guide Step by Step */}
            <div className="lg:col-span-7 text-xs space-y-3 text-zinc-650 font-medium">
              <p className="font-bold text-zinc-800">¿Cómo hacerlo funcionar totalmente gratis en 1 minuto?</p>
              <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                <li>Regístrese gratis en <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" className="text-red-800 font-black hover:underline inline-flex items-center gap-0.5">emailjs.com <Globe className="w-3 h-3" /></a></li>
                <li>Conecte su cuenta de correo en la pestaña <strong>Email Services</strong> (ej: su Gmail personal). Esto generará un <strong>Service ID</strong>.</li>
                <li>Vaya a la pestaña <strong>Email Templates</strong>, cree una plantilla de correos e ingrese estos parámetros:
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-[10px] text-zinc-500 bg-zinc-105 p-2 rounded-lg font-mono">
                    <li>Para destino: <code className="text-zinc-700 font-bold">&#123;&#123;to_email&#125;&#125;</code></li>
                    <li>Nombre usuario: <code className="text-zinc-700 font-bold">&#123;&#123;to_name&#125;&#125;</code></li>
                    <li>Título pago: <code className="text-zinc-700 font-bold">&#123;&#123;payment_title&#125;&#125;</code></li>
                    <li>Vencimiento: <code className="text-zinc-700 font-bold">&#123;&#123;payment_due_date&#125;&#125;</code></li>
                  </ul>
                </li>
                <li>Copie su <strong>Public Key</strong> en Account &rarr; API Keys.</li>
                <li>Ingrese sus credenciales en el formulario de la derecha (o en el archivo .env) y el sistema estará 100% operativo enviando correos instantáneos de verdad.</li>
              </ol>
            </div>

            {/* Config Form Inputs */}
            <form onSubmit={handleSaveConfig} className="lg:col-span-5 bg-white p-4 border border-zinc-150 rounded-2xl space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-800">Credenciales Locales de Correo</p>
              
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Service ID</label>
                <input
                  type="text"
                  placeholder="Ej: service_gmail"
                  className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-800"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Template ID</label>
                <input
                  type="text"
                  placeholder="Ej: template_xxxxxx"
                  className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-800"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Public Key / User Key</label>
                <input
                  type="text"
                  placeholder="Ej: pk_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-800"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Guardar Conexión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Overlay */}
      {isFormOpen && (
        <form onSubmit={handleAddReminder} className="bg-white p-6 border border-zinc-150 rounded-3xl shadow-xl space-y-4 animate-slide-up">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-red-850" />
              Nuevo Recordatorio de Pago Recurrente
            </h4>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-zinc-400 hover:text-red-800 font-bold">Cerrar</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Concepto / Nombre del Pago *</label>
              <input
                type="text"
                required
                placeholder="Ej: Claro Hogar 300MB, Alquiler de Local"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-250 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-red-800"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Categoría Útil *</label>
              <select
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-250 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-red-800"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="internet">Internet</option>
                <option value="Netflix">Netflix</option>
                <option value="renta">Renta o Vivienda</option>
                <option value="tarjetas">Tarjetas de Crédito</option>
                <option value="préstamos">Préstamos personales</option>
                <option value="otro">Otro Pago</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Monto Estimado (RD$) *</label>
              <input
                type="number"
                required
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-250 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-red-800"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Próxima Fecha de Vencimiento *</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-250 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-red-800"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <p className="text-[10px] text-zinc-400 mt-1">Sugerencia: Ponga la fecha de mañana para ver el aviso de "Tu pago vence mañana".</p>
            </div>

            <div className="flex items-center gap-2 pl-2 self-center">
              <input
                type="checkbox"
                id="email-notif-toggle"
                className="w-4 h-4 rounded text-red-800 border-zinc-200 outline-none"
                checked={emailNotification}
                onChange={(e) => setEmailNotification(e.target.checked)}
              />
              <label htmlFor="email-notif-toggle" className="text-xs text-zinc-650 font-semibold select-none">
                Enviar alerta por correo electrónico (<span className="text-zinc-500 font-mono">{userEmail}</span>)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-zinc-150 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold rounded-xl"
            >
              Guardar Recordatorio
            </button>
          </div>
        </form>
      )}

      {/* Main reminders ledger layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Ledger list of reminders (Left panel) */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white border border-zinc-150 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-black text-zinc-850 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-805" />
                Listado de Obligaciones Recurrentes
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">Total registrados: {reminders.length}</p>
            </div>

            {reminders.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-zinc-150 rounded-2xl text-zinc-400">
                <Calendar className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
                <p className="font-bold text-xs">No tiene recordatorios de pagos configurados.</p>
                <p className="text-[10px] text-zinc-400 mt-1">Presione el botón "Nuevo Recordatorio" arriba para registrar su primer pago.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {reminders.map(item => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tomorrowStr = tomorrow.toISOString().split('T')[0];

                  const isDueTomorrow = !item.completed && item.dueDate === tomorrowStr;
                  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.otro;
                  const CatIcon = config.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleComplete(item.id)}
                      className={cn(
                        "py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 px-3 rounded-2xl transition-all group",
                        item.completed && "opacity-60 bg-zinc-50/50",
                        isDueTomorrow && "bg-red-50/40 hover:bg-red-50 border-l-4 border-red-800 pl-4"
                      )}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {/* Category icon */}
                        <div className={cn(
                          "p-3 rounded-2xl border",
                          config.color
                        )}>
                          <CatIcon className="w-5 h-5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={cn(
                              "text-xs sm:text-sm font-black text-zinc-950",
                              item.completed && "line-through text-zinc-400"
                            )}>
                              {item.title}
                            </h4>
                            {isDueTomorrow && (
                              <span className="px-2 py-0.5 bg-red-150 text-red-800 border border-red-200 text-[9px] font-black uppercase rounded animate-pulse inline-flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Vence Mañana
                              </span>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 font-semibold">
                            <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md uppercase">
                              {config.label}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              Vence: <strong>{new Date(item.dueDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Amount Status Actions */}
                      <div className="flex items-center justify-between sm:justify-start gap-4 border-t sm:border-none pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-extrabold">Monto Fijo</span>
                          <span className={cn(
                            "text-sm font-black",
                            item.completed ? "text-zinc-500" : isDueTomorrow ? "text-red-800" : "text-zinc-900"
                          )}>
                            {formatCurrency(item.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {/* Complete status */}
                          <button
                            onClick={() => handleToggleComplete(item.id)}
                            className={cn(
                              "p-2 rounded-xl border transition-all flex items-center justify-center",
                              item.completed 
                                ? "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200" 
                                : "bg-white border-zinc-200 text-zinc-400 hover:text-red-800 hover:border-red-800"
                            )}
                            title={item.completed ? "Marcar como pendiente" : "Marcar como pagado"}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          {/* Email notification status / Trigger manual send test */}
                          {item.emailNotification && (
                            <button
                              onClick={(e) => handleManualEmailTest(item, e)}
                              className={cn(
                                "p-2 rounded-xl border transition-all flex items-center justify-center relative",
                                item.lastNotifiedOption 
                                  ? "bg-blue-105 border-blue-300 text-blue-700 hover:bg-blue-150" 
                                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-blue-800 hover:bg-blue-50"
                              )}
                              title="Disparar recordatorio al email ahora mismo"
                            >
                              <Send className="w-4 h-4" />
                              {item.lastNotifiedOption && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 border border-white rounded-full" />
                              )}
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={(e) => handleDeleteReminder(item.id, e)}
                            className="p-2 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                            title="Eliminar recordatorio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic logs monitor & instructions (Right panel) */}
        <div className="xl:col-span-4 space-y-6">
          <div className="glass-card bg-zinc-900 text-zinc-100 p-5 rounded-3xl space-y-4 shadow-xl border border-zinc-800">
            <h4 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
              <Zap className="w-4 h-4 animate-pulse" />
              Monitor de Envío de Alertas Nova
            </h4>

            <p className="text-[11px] text-zinc-400 leading-normal font-medium">
              A continuación se muestra el registro del sistema de alertas en tiempo real. Cuando los pagos se acercan, el planificador despacha el correo y emite las notificaciones de inmediato.
            </p>

            <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 font-mono text-[10px] space-y-1.5 max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-zinc-600 italic">No existen registros recientes del supervisor de pagos.</p>
              ) : (
                logs.map((log, idx) => (
                  <p key={idx} className="text-zinc-300 leading-relaxed break-words">{log}</p>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase">
              <span>Destinatario:</span>
              <span className="text-red-400 text-[11px] select-all">{userEmail}</span>
            </div>
            
            <button
              onClick={checkPaymentDeadlines}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-zinc-700"
            >
              <Bell className="w-3.5 h-3.5 text-red-500" />
              Ejecutar Comprobación Manual
            </button>
          </div>

          <div className="glass-card bg-white border border-zinc-150 p-5 rounded-3xl space-y-3 shadow-sm text-zinc-650 text-xs">
            <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-800" />
              Acerca de las Alertas
            </h4>
            <ul className="list-disc pl-4 space-y-2 leading-relaxed">
              <li>Usted recibirá una advertencia <span className="text-red-800 font-bold">"Tu pago vence mañana"</span> si tiene pagos programados para el día siguiente.</li>
              <li>Asegúrese de mantener activa la pestaña "Alerta por correo electrónico" en el pago deseado.</li>
              <li>Para que no se repitan correos sobre el mismo pago, el sistema almacena de forma inteligente la fecha notificada.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
