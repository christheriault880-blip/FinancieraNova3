import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  User, 
  Plus, 
  Trash2, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Search, 
  X, 
  PenTool,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Award
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'collection' | 'meeting' | 'reminder' | 'evaluation';
  clientName: string;
  amount?: number;
  completed: boolean;
  notes?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  debtAmount: number; // Balance pendiente
  status: 'active' | 'prospect' | 'debtor';
  notes?: string;
}

interface QuickNote {
  id: string;
  content: string;
  color: 'red' | 'amber' | 'zinc' | 'emerald';
  createdAt: string;
}

export default function Agenda() {
  // Load initial data from localStorage or fallback
  const [events, setEvents] = useState<AgendaEvent[]>(() => {
    const saved = localStorage.getItem('nova_agenda_events');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        title: 'Cobro de Cuota Mensual - Alquiler Comercial',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        type: 'collection',
        clientName: 'Constructora del Caribe SRL',
        amount: 35000,
        completed: false,
        notes: 'Llamar antes de ir para confirmar recepción del cheque'
      },
      {
        id: '2',
        title: 'Cita de Asesoramiento Financiero',
        date: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return d.toISOString().split('T')[0];
        })(),
        time: '15:30',
        type: 'meeting',
        clientName: 'Eduardo Martínez',
        amount: 4500,
        completed: false,
        notes: 'Conversar sobre estrategias impositivas e ITBIS'
      }
    ];
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('nova_agenda_contacts');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        name: 'Constructora del Caribe SRL',
        phone: '809-555-0122',
        email: 'caribe.const@gmail.com',
        company: 'CONCARIBE',
        debtAmount: 35000,
        status: 'debtor',
        notes: 'Excelente cliente comercial, alquiler mensual recurrente'
      },
      {
        id: '2',
        name: 'Eduardo Martínez',
        phone: '829-555-8941',
        email: 'emartinez@finance.com',
        company: 'E&M Consulting',
        debtAmount: 0,
        status: 'active',
        notes: 'Cliente de consultoría recurrente'
      },
      {
        id: '3',
        name: 'Lucía Paredes',
        phone: '809-555-4321',
        email: 'lucia_p@outlook.com',
        company: 'Ventas Santo Domingo',
        debtAmount: 0,
        status: 'prospect',
        notes: 'Interesada en programa de ahorros Nova'
      }
    ];
  });

  const [notes, setNotes] = useState<QuickNote[]>(() => {
    const saved = localStorage.getItem('nova_agenda_notes');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        content: 'Revisar tasas de cambio del dólar e ITBIS para la próxima emisión de facturas.',
        color: 'red',
        createdAt: new Date().toLocaleDateString()
      },
      {
        id: '2',
        content: 'Imprimir estados de cuenta del inventario para auditoría interna.',
        color: 'amber',
        createdAt: new Date().toLocaleDateString()
      }
    ];
  });

  // State managers
  const [activeTab, setActiveTab] = useState<'events' | 'contacts' | 'notes'>('events');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State: Event
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState(new Date().toISOString().split('T')[0]);
  const [evtTime, setEvtTime] = useState('09:00');
  const [evtType, setEvtType] = useState<'collection' | 'meeting' | 'reminder' | 'evaluation'>('meeting');
  const [evtClient, setEvtClient] = useState('');
  const [evtAmount, setEvtAmount] = useState('');
  const [evtNotes, setEvtNotes] = useState('');

  // Form State: Contact
  const [showContactForm, setShowContactForm] = useState(false);
  const [conName, setConName] = useState('');
  const [conPhone, setConPhone] = useState('');
  const [conEmail, setConEmail] = useState('');
  const [conCompany, setConCompany] = useState('');
  const [conDebt, setConDebt] = useState('');
  const [conStatus, setConStatus] = useState<'active' | 'prospect' | 'debtor'>('active');
  const [conNotes, setConNotes] = useState('');

  // Form State: QuickNote
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState<'red' | 'amber' | 'zinc' | 'emerald'>('red');

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('nova_agenda_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('nova_agenda_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('nova_agenda_notes', JSON.stringify(notes));
  }, [notes]);

  // Handlers: Events
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle || !evtDate) return;

    const newEvt: AgendaEvent = {
      id: Math.random().toString(),
      title: evtTitle,
      date: evtDate,
      time: evtTime || '12:00',
      type: evtType,
      clientName: evtClient || 'Ninguno',
      amount: evtAmount ? Number(evtAmount) : undefined,
      completed: false,
      notes: evtNotes
    };

    setEvents([newEvt, ...events]);
    setShowEventForm(false);
    
    // Reset Form
    setEvtTitle('');
    setEvtDate(new Date().toISOString().split('T')[0]);
    setEvtTime('09:00');
    setEvtType('meeting');
    setEvtClient('');
    setEvtAmount('');
    setEvtNotes('');
  };

  const handleToggleEvent = (id: string) => {
    setEvents(events.map(ev => ev.id === id ? { ...ev, completed: !ev.completed } : ev));
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(ev => ev.id !== id));
  };

  // Handlers: Contacts
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conName) return;

    const newCon: Contact = {
      id: Math.random().toString(),
      name: conName,
      phone: conPhone || 'N/D',
      email: conEmail || 'N/D',
      company: conCompany || 'N/D',
      debtAmount: conDebt ? Number(conDebt) : 0,
      status: conStatus,
      notes: conNotes
    };

    setContacts([newCon, ...contacts]);
    setShowContactForm(false);

    // Reset Form
    setConName('');
    setConPhone('');
    setConEmail('');
    setConCompany('');
    setConDebt('');
    setConStatus('active');
    setConNotes('');
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  // Handlers: Notes
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    const newNote: QuickNote = {
      id: Math.random().toString(),
      content: noteContent.trim(),
      color: noteColor,
      createdAt: new Date().toLocaleDateString()
    };

    setNotes([newNote, ...notes]);
    setNoteContent('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  // Filters
  const filteredEvents = events.filter(e => {
    const searchLow = searchTerm.toLowerCase();
    return (
      e.title.toLowerCase().includes(searchLow) ||
      e.clientName.toLowerCase().includes(searchLow) ||
      (e.notes && e.notes.toLowerCase().includes(searchLow))
    );
  }).sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  const filteredContacts = contacts.filter(c => {
    const searchLow = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLow) ||
      c.company.toLowerCase().includes(searchLow) ||
      c.phone.includes(searchLow) ||
      c.email.toLowerCase().includes(searchLow)
    );
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Agenda & Planificador</h2>
          <p className="text-zinc-500">
            Organiza reuniones con clientes, programa fechas límite de cobro y gestiona notas de seguimiento estratégico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'events' && (
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-100"
            >
              <Plus className="w-4 h-4" />
              Programar Evento o Cobro
            </button>
          )}
          {activeTab === 'contacts' && (
            <button
              onClick={() => setShowContactForm(!showContactForm)}
              className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-100"
            >
              <Plus className="w-4 h-4" />
              Nuevo Contacto de Negocio
            </button>
          )}
        </div>
      </div>

      {/* Overview Analytics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Eventos Activos</p>
            <p className="text-2xl font-black text-zinc-950">{events.filter(e => !e.completed).length}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-800">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cartera de Contactos</p>
            <p className="text-2xl font-black text-zinc-950">{contacts.length}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-800">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Balances Pendientes</p>
            <p className="text-lg font-black text-amber-800">
              RD$ {contacts.reduce((acc, curr) => acc + curr.debtAmount, 0).toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-800">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('events'); setSearchTerm(''); }}
            className={cn(
              "px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-[6px]",
              activeTab === 'events' ? "border-red-800 text-red-800" : "border-transparent text-zinc-400 hover:text-zinc-600"
            )}
          >
            Agenda de Eventos & Cobros
          </button>
          <button
            onClick={() => { setActiveTab('contacts'); setSearchTerm(''); }}
            className={cn(
              "px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-[6px]",
              activeTab === 'contacts' ? "border-red-800 text-red-800" : "border-transparent text-zinc-400 hover:text-zinc-600"
            )}
          >
            Contactos & Deudores
          </button>
          <button
            onClick={() => { setActiveTab('notes'); setSearchTerm(''); }}
            className={cn(
              "px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-[6px]",
              activeTab === 'notes' ? "border-red-800 text-red-800" : "border-transparent text-zinc-400 hover:text-zinc-600"
            )}
          >
            Tablón de Notas Adhesivas
          </button>
        </div>

        {activeTab !== 'notes' && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Main Container Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* TAB 1: EVENTS */}
        {activeTab === 'events' && (
          <div className="lg:col-span-12 space-y-6">
            
            {/* Appointment / Event Creation Form Overlay or Inline */}
            {showEventForm && (
              <form onSubmit={handleAddEvent} className="bg-white p-6 border border-zinc-150 rounded-3xl shadow-lg space-y-4 animate-slide-up">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                  <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-red-800" />
                    Programar Nueva Entrada
                  </h4>
                  <button type="button" onClick={() => setShowEventForm(false)} className="text-zinc-400 hover:text-red-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Título / Concepto o Tarea</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej: Firma de Contrato Hipotecario"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={evtTitle}
                      onChange={(e) => setEvtTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Tipo de Evento</label>
                    <select
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={evtType}
                      onChange={(e) => setEvtType(e.target.value as any)}
                    >
                      <option value="meeting">Cita de Negocios</option>
                      <option value="collection">Recordatorio de Cobro</option>
                      <option value="reminder">Tarea / Recordatorio</option>
                      <option value="evaluation">Evaluación o Tasación de Activos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fecha</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={evtDate}
                      onChange={(e) => setEvtDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Hora</label>
                    <input 
                      type="time"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={evtTime}
                      onChange={(e) => setEvtTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cliente Vinculado</label>
                    <input 
                      type="text"
                      placeholder="Ej: Constructora del Caribe SRL"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={evtClient}
                      onChange={(e) => setEvtClient(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Monto Estimado (RD$)</label>
                    <input 
                      type="number"
                      placeholder="Opcional"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={evtAmount}
                      onChange={(e) => setEvtAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Notas de Coordinación</label>
                  <textarea
                    rows={2}
                    placeholder="Escribe instrucciones de entrega, dirección exacta u observaciones adicionales..."
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={evtNotes}
                    onChange={(e) => setEvtNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEventForm(false)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold rounded-xl"
                  >
                    Guardar en Agenda
                  </button>
                </div>
              </form>
            )}

            {/* List of Scheduled Events */}
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="glass-card bg-white p-12 text-center rounded-2xl border border-dashed border-zinc-200">
                  <CalendarIcon className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                  <p className="text-zinc-500 text-xs font-bold">No hay eventos ni cobros programados para esta búsqueda.</p>
                  <p className="text-zinc-400 text-[10px] mt-1">Usa el botón superior para agregar un evento legal o cita impositiva.</p>
                </div>
              ) : (
                filteredEvents.map(ev => (
                  <div 
                    key={ev.id}
                    className={cn(
                      "p-5 bg-white border border-zinc-150 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                      ev.completed && "opacity-60 bg-zinc-50"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Left icon colored by type */}
                      <div className={cn(
                        "p-3 rounded-xl",
                        ev.type === 'collection' && "bg-emerald-50 text-emerald-800",
                        ev.type === 'meeting' && "bg-red-50 text-red-800",
                        ev.type === 'evaluation' && "bg-blue-50 text-blue-800",
                        ev.type === 'reminder' && "bg-amber-50 text-amber-800"
                      )}>
                        <CalendarIcon className="w-5 h-5 animate-pulse" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={cn(
                            "text-xs md:text-sm font-black text-zinc-900 leading-snug",
                            ev.completed && "line-through text-zinc-400"
                          )}>
                            {ev.title}
                          </h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                            ev.type === 'collection' && "bg-emerald-50 text-emerald-700",
                            ev.type === 'meeting' && "bg-red-50 text-red-700",
                            ev.type === 'evaluation' && "bg-blue-50 text-blue-700",
                            ev.type === 'reminder' && "bg-amber-50 text-amber-700"
                          )}>
                            {ev.type === 'collection' ? 'Cobranza' : ev.type === 'meeting' ? 'Reunión' : ev.type === 'evaluation' ? 'Tasación' : 'Recordatorio'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {ev.date} - {ev.time}
                          </span>
                          {ev.clientName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              Cliente: <strong className="text-zinc-700">{ev.clientName}</strong>
                            </span>
                          )}
                          {ev.amount && (
                            <span className="text-emerald-700 font-bold">
                              Valor: RD$ {ev.amount.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {ev.notes && (
                          <p className="text-[11px] text-zinc-400 bg-zinc-50 p-2 rounded-lg border border-zinc-100 max-w-xl">
                            {ev.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleToggleEvent(ev.id)}
                        className={cn(
                          "p-2 rounded-xl border transition-all flex items-center justify-center",
                          ev.completed 
                            ? "bg-green-100 border-green-300 text-green-800" 
                            : "bg-white border-zinc-200 text-zinc-400 hover:text-red-800 hover:border-red-800"
                        )}
                        title={ev.completed ? "Desmarcar como completada" : "Completar cita o cobro"}
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-2 text-zinc-400 hover:text-red-800 hover:bg-red-50 rounded-xl border border-transparent transition-all"
                        title="Eliminar de agenda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* TAB 2: CLIENT PORTFOLIO / CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="lg:col-span-12 space-y-6">
            
            {showContactForm && (
              <form onSubmit={handleAddContact} className="bg-white p-6 border border-zinc-150 rounded-3xl shadow-lg space-y-4 animate-slide-up">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                  <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-red-800" />
                    Nuevo Contacto de Negocio
                  </h4>
                  <button type="button" onClick={() => setShowContactForm(false)} className="text-zinc-400 hover:text-red-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nombre Completo / Razón Social *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej: Constructora del Caribe SRL"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={conName}
                      onChange={(e) => setConName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Empresa / Abreviatura</label>
                    <input 
                      type="text"
                      placeholder="Ej: CONCARIBE"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={conCompany}
                      onChange={(e) => setConCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Teléfono</label>
                    <input 
                      type="text"
                      placeholder="Ej: 809-555-0100"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={conPhone}
                      onChange={(e) => setConPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email</label>
                    <input 
                      type="email"
                      placeholder="Ej: info@empresa.com"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={conEmail}
                      onChange={(e) => setConEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Balance Pendiente (RD$)</label>
                    <input 
                      type="number"
                      placeholder="Cobros o deudas acumuladas"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={conDebt}
                      onChange={(e) => setConDebt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Clasificación de Contacto</label>
                    <select
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={conStatus}
                      onChange={(e) => setConStatus(e.target.value as any)}
                    >
                      <option value="active">Cliente Activo</option>
                      <option value="prospect">Prospecto de Negocio</option>
                      <option value="debtor">Deudor / Crédito Abierto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Notas / Observaciones del Cliente</label>
                    <input 
                      type="text"
                      placeholder="Ej: Excelente deudor de cuotas mensuales"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={conNotes}
                      onChange={(e) => setConNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold rounded-xl"
                  >
                    Añadir Contacto
                  </button>
                </div>
              </form>
            )}

            {/* List Contacts Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredContacts.length === 0 ? (
                <div className="col-span-full glass-card bg-white p-12 text-center rounded-2xl border border-dashed border-zinc-200">
                  <User className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                  <p className="text-zinc-500 text-xs font-bold">No se encontraron contactos en tu cartera.</p>
                </div>
              ) : (
                filteredContacts.map(c => (
                  <div key={c.id} className="bg-white border border-zinc-150 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-zinc-900 leading-snug truncate uppercase tracking-tight">{c.name}</h4>
                        {c.company && <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">{c.company}</p>}
                      </div>

                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        c.status === 'active' && "bg-green-50 text-green-700 border border-green-100",
                        c.status === 'prospect' && "bg-blue-50 text-blue-700 border border-blue-100",
                        c.status === 'debtor' && "bg-red-50 text-red-700 border border-red-100"
                      )}>
                        {c.status === 'active' ? 'Activo' : c.status === 'prospect' ? 'Prospecto' : 'Con Deuda'}
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] text-zinc-500 font-medium">
                      {c.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{c.phone}</span>
                        </p>
                      )}
                      {c.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="truncate">{c.email}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-2 font-bold text-zinc-700">
                        <DollarSign className="w-3.5 h-3.5 text-red-800" />
                        <span>Monto Pendiente: <strong className="text-zinc-900">RD$ {c.debtAmount.toLocaleString()}</strong></span>
                      </p>
                    </div>

                    {c.notes && (
                      <p className="text-[10px] text-zinc-400 bg-zinc-50/50 p-2 border border-zinc-100 rounded-xl leading-relaxed">
                        {c.notes}
                      </p>
                    )}

                    <div className="flex justify-end pt-2 border-t border-zinc-100">
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="text-red-700 hover:text-red-900 hover:bg-red-50 p-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* TAB 3: NOTES BOARD */}
        {activeTab === 'notes' && (
          <div className="lg:col-span-12 space-y-8 animate-fade-in">
            {/* Quick Note Input Form */}
            <form onSubmit={handleAddNote} className="bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-800">Tablero de Notas & Acciones Rápidas</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    required
                    placeholder="Escribe un recordatorio inmediato (Ej: Llamar a constructora para coordinar endoso de pagarés)..."
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-3">
                  <div className="flex gap-2">
                    {(['red', 'amber', 'emerald', 'zinc'] as const).map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNoteColor(color)}
                        className={cn(
                          "w-6 h-6 rounded-full border transition-all",
                          color === 'red' && "bg-red-500 border-red-700",
                          color === 'amber' && "bg-amber-500 border-amber-700",
                          color === 'emerald' && "bg-emerald-500 border-emerald-700",
                          color === 'zinc' && "bg-zinc-500 border-zinc-700",
                          noteColor === color ? "scale-125 ring-2 ring-zinc-400" : "opacity-80"
                        )}
                        title={`Color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <button
                    type="submit"
                    className="w-full py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Fijar
                  </button>
                </div>
              </div>
            </form>

            {/* Note Board Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {notes.length === 0 ? (
                <div className="col-span-full py-12 text-center text-zinc-400 text-xs">
                  Aún no has agregado ninguna nota adhesiva rápida.
                </div>
              ) : (
                notes.map(n => (
                  <div 
                    key={n.id} 
                    className={cn(
                      "p-5 rounded-2xl relative shadow-sm border space-y-4 text-xs font-medium flex flex-col justify-between",
                      n.color === 'red' && "bg-red-50/50 border-red-150 text-red-950",
                      n.color === 'amber' && "bg-amber-50/50 border-amber-150 text-amber-950",
                      n.color === 'emerald' && "bg-emerald-50/50 border-emerald-150 text-emerald-950",
                      n.color === 'zinc' && "bg-zinc-50/50 border-zinc-150 text-zinc-950"
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-line select-text">
                      {n.content}
                    </p>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-205/40 text-[10px] text-zinc-400">
                      <span>Fijada: {n.createdAt}</span>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-red-800 hover:text-red-950 transition-all font-black"
                        title="Desprender nota de tablero"
                      >
                        Desprender
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
