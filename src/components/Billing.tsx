import { useState, useRef, useEffect } from 'react';
import { 
  ReceiptText, 
  Printer, 
  Plus, 
  Trash2, 
  User, 
  FileSpreadsheet, 
  Percent, 
  Calendar, 
  FileText, 
  Hash, 
  Building,
  CheckCircle2,
  Search,
  FolderOpen
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientRnc: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  discount: number;
  currency: string;
  status: 'pending' | 'paid';
  items: InvoiceItem[];
  issuerName: string;
  issuerRnc: string;
  issuerAddress: string;
  issuerPhone: string;
  issuerEmail: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
}

const EXCHANGE_RATES: Record<string, number> = {
  'RD$': 1,
  'US$': 60, // 1 USD = 60 RD$
  'EUR': 64, // 1 EUR = 64 RD$
};

const convertAmount = (amount: number, from: string, to: string) => {
  const fromRate = EXCHANGE_RATES[from] || 1;
  const toRate = EXCHANGE_RATES[to] || 1;
  const inBase = amount * fromRate;
  return Number((inBase / toRate).toFixed(2));
};

export default function Billing() {
  const { profile } = useAuth();
  
  // Custom Issuer/Company Details Configuration
  const [issuerName, setIssuerName] = useState('Financiera Nova');
  const [issuerRnc, setIssuerRnc] = useState('1-01-88432-1');
  const [issuerAddress, setIssuerAddress] = useState('Av. Winston Churchill, Plaza Central, Santo Domingo');
  const [issuerPhone, setIssuerPhone] = useState('(809) 555-0199');
  const [issuerEmail, setIssuerEmail] = useState('soporte@financieranova.com.do');

  // Invoice General Details
  const [clientName, setClientName] = useState('');
  const [clientRnc, setClientRnc] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`FN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  
  // Tax & Discounts
  const [taxRate, setTaxRate] = useState(18); // default ITBIS 18%
  const [discount, setDiscount] = useState(0); // RD$ Discount
  const [currency, setCurrency] = useState('RD$');
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');

  // Invoice Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Consultoría Financiera Nova', quantity: 1, price: 3500 },
  ]);

  // Current Input Row
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Saved Invoices History states
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>(() => {
    const saved = localStorage.getItem('nova_saved_invoices');
    if (saved) return JSON.parse(saved);
    return [];
  });
  const [savedSearchTerm, setSavedSearchTerm] = useState('');

  // Save changes to localStorage on change
  useEffect(() => {
    localStorage.setItem('nova_saved_invoices', JSON.stringify(savedInvoices));
  }, [savedInvoices]);

  // Handler to clear form and start new invoice
  const handleNewInvoice = () => {
    setInvoiceNumber(`FN-${Math.floor(100000 + Math.random() * 900000)}`);
    setClientName('');
    setClientRnc('');
    setClientEmail('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setDueDate(d.toISOString().split('T')[0]);
    setTaxRate(18);
    setDiscount(0);
    setCurrency('RD$');
    setStatus('pending');
    setItems([{ id: '1', description: 'Consultoría Financiera Nova', quantity: 1, price: 3500 }]);
  };

  // Handler to save current invoice draft in history
  const handleSaveInvoice = () => {
    if (!clientName) {
      alert('Por favor ingrese el nombre del cliente antes de guardar la factura.');
      return;
    }

    const currentInvoice: SavedInvoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber,
      clientName,
      clientRnc,
      clientEmail,
      issueDate,
      dueDate,
      taxRate,
      discount,
      currency,
      status,
      items,
      issuerName,
      issuerRnc,
      issuerAddress,
      issuerPhone,
      issuerEmail,
      subtotal,
      taxAmount,
      grandTotal
    };

    const existsIndex = savedInvoices.findIndex(inv => inv.invoiceNumber === invoiceNumber);
    let updated: SavedInvoice[];
    if (existsIndex >= 0) {
      const confirmOverwrite = window.confirm(`La factura con código ${invoiceNumber} ya existe en el historial. ¿Desea sobrescribirla / actualizarla con los datos actuales?`);
      if (confirmOverwrite) {
        updated = [...savedInvoices];
        updated[existsIndex] = currentInvoice;
      } else {
        return;
      }
    } else {
      updated = [currentInvoice, ...savedInvoices];
    }

    setSavedInvoices(updated);
    alert(`Factura ${invoiceNumber} guardada en su historial local.`);
  };

  // Handler to load selected historical invoice
  const handleLoadInvoice = (inv: SavedInvoice) => {
    setInvoiceNumber(inv.invoiceNumber);
    setClientName(inv.clientName);
    setClientRnc(inv.clientRnc || '');
    setClientEmail(inv.clientEmail || '');
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    setTaxRate(inv.taxRate);
    setDiscount(inv.discount || 0);
    setCurrency(inv.currency);
    setStatus(inv.status);
    setItems(inv.items);
    setIssuerName(inv.issuerName || 'Financiera Nova');
    setIssuerRnc(inv.issuerRnc || '');
    setIssuerAddress(inv.issuerAddress || '');
    setIssuerPhone(inv.issuerPhone || '');
    setIssuerEmail(inv.issuerEmail || '');
  };

  // Handler to delete saved invoice
  const handleDeleteSavedInvoice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = window.confirm('¿Está seguro de que desea eliminar esta factura guardada del historial?');
    if (!confirmDelete) return;

    setSavedInvoices(savedInvoices.filter(inv => inv.id !== id));
  };

  const handleCurrencyChange = (newCurrency: string) => {
    const previousCurrency = currency;
    if (previousCurrency === newCurrency) return;
    setCurrency(newCurrency);

    // Convert existing items prices
    setItems(prev => prev.map(item => ({
      ...item,
      price: convertAmount(item.price, previousCurrency, newCurrency)
    })));

    // Convert discount
    if (discount > 0) {
      setDiscount(convertAmount(discount, previousCurrency, newCurrency));
    }

    // Convert current form input item price if it is entered
    if (newItemPrice > 0) {
      setNewItemPrice(convertAmount(newItemPrice, previousCurrency, newCurrency));
    }
  };

  // Handlers
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc || newItemPrice <= 0 || newItemQty <= 0) return;
    
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        description: newItemDesc,
        quantity: Number(newItemQty),
        price: Number(newItemPrice)
      }
    ]);
    
    // reset input
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      alert('La factura debe tener al menos un ítem.');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  // Calculations
  const subtotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);

  // Trigger print
  const handlePrint = () => {
    if (!clientName) {
      alert('Por favor ingrese el nombre del cliente antes de progresar e imprimir.');
      return;
    }

    try {
      const invoiceElement = document.getElementById('printable-invoice-area');
      if (!invoiceElement) {
        window.print();
        return;
      }

      // Try opening a new clean print window/tab with styled contents
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Factura ${invoiceNumber} - ${clientName}</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
              <script src="https://cdn.tailwindcss.com"></script>
              <script>
                tailwind.config = {
                  theme: {
                    extend: {
                      colors: {
                        red: {
                          750: '#b91c1c',
                          800: '#991b1b',
                          900: '#7f1d1d'
                        }
                      }
                    }
                  }
                }
              </script>
              <style>
                body {
                  font-family: 'Inter', sans-serif;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  background-color: #ffffff;
                }
                @media print {
                  .no-print {
                    display: none !important;
                  }
                  body {
                    padding: 0;
                    margin: 0;
                  }
                }
              </style>
            </head>
            <body class="bg-white text-zinc-800 p-6 sm:p-12">
              <div class="max-w-4xl mx-auto border border-zinc-150 rounded-3xl p-8 sm:p-12 bg-white shadow-sm">
                ${invoiceElement.innerHTML}
              </div>
              <div class="max-w-4xl mx-auto mt-6 flex justify-between items-center no-print bg-zinc-50 border border-zinc-200 p-4 rounded-2xl">
                <p class="text-xs text-zinc-500 font-medium">Esta es la vista de impresión optimizada para Financiera Nova. ¿No emergió el diálogo de impresión automáticamente?</p>
                <div class="flex gap-2">
                  <button onclick="window.print()" class="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold transition-all">
                    Iniciar Impresión
                  </button>
                  <button onclick="window.close()" class="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-xl text-xs font-bold transition-all">
                    Cerrar Ventana
                  </button>
                </div>
              </div>
              <script>
                // Execute automatic print initiation with a slight buffer so styles apply perfectly
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        // Fallback for pop-up blockers: run direct print
        window.print();
      }
    } catch (error) {
      console.warn("Iframe popup print triggered fallback:", error);
      window.print();
    }
  };

  return (
    <div id="billing-container" className="space-y-8">
      {/* CSS rules to completely style print view cleanly (Hiding sidebar, header, buttons) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice-area, #printable-invoice-area * {
            visibility: visible !important;
          }
          #printable-invoice-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            padding: 0px !important;
            margin: 0px !important;
          }
          /* Hide non-printable items inside the printable region */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Facturación y Cobros</h2>
          <p className="text-zinc-500 text-xs sm:text-sm">Consolida facturas de tus activos, servicios profesionales o préstamos de manera instantánea o recupéralas desde el historial.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button 
            onClick={handleNewInvoice}
            className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs sm:text-sm font-semibold transition-all h-10"
            title="Nueva Factura en Blanco"
          >
            Limpiar / Nueva
          </button>
          
          <button 
            onClick={handleSaveInvoice}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-zinc-100 h-10"
            title="Guardar Factura creada en el Historial"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Guardar Factura
          </button>

          <button 
            id="btn-print-main"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-red-100 h-10 border border-red-750"
            title="Imprimir Factura"
          >
            <Printer className="w-4 h-4" />
            Imprimir Factura
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Editor Form (Left Panel) */}
        <div className="xl:col-span-6 space-y-6">
          {/* Issuer details (Tus Datos / Emisor) */}
          <div className="glass-card bg-white p-6 border border-zinc-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">
              <Building className="w-4 h-4 text-red-800" />
              Tus Datos de Emisor (Empresa / Negocio)
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nombre de Tu Empresa / Negocio *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Financiera Nova, SRL"
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none font-bold"
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Tu RNC / Cédula Comercial</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 1-01-88432-1"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={issuerRnc}
                    onChange={(e) => setIssuerRnc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Tu Teléfono de Contacto</label>
                  <input 
                    type="text" 
                    placeholder="Ej: (809) 555-0199"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={issuerPhone}
                    onChange={(e) => setIssuerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Dirección de Operaciones</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Av. Winston Churchill, Santo Domingo"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={issuerAddress}
                    onChange={(e) => setIssuerAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email / Web</label>
                  <input 
                    type="text" 
                    placeholder="Ej: contacto@tuempresa.com"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={issuerEmail}
                    onChange={(e) => setIssuerEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Client & Metadata Card */}
          <div className="glass-card bg-white p-6 border border-zinc-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4 text-red-800" />
              Información de Facturación
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nombre del Cliente / Empresa *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Constructora del Caribe SRL"
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">RNC / Cédula / Tax ID</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input 
                      type="text" 
                      placeholder="Ej: 1-30-58843-2"
                      className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                      value={clientRnc}
                      onChange={(e) => setClientRnc(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Correo Electrónico (Cliente)</label>
                  <input 
                    type="email" 
                    placeholder="ejemplo@correo.com"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nº de Factura</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                    <input 
                      type="text" 
                      className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none font-bold"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fecha Emisión</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fecha Vencimiento</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Add Line Item Form Segment */}
          <div className="glass-card bg-white p-6 border border-zinc-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-red-800" />
              Ítems y Conceptos Facturados
            </h3>

            <form onSubmit={handleAddItem} className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-150 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-800">Agregar Concepto</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Descripción del concepto</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Alquiler Local Comercial Naco"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Cant.</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Precio Unit. ($)</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                    value={newItemPrice || ''}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-1">
                  <button 
                    type="submit"
                    className="w-full p-2 bg-red-800 hover:bg-red-900 text-white rounded-xl flex items-center justify-center transition-all h-9"
                    title="Añadir ítem"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            {/* List of current line items draft */}
            <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-800 truncate">{item.description}</p>
                    <p className="text-[10px] text-zinc-500">{item.quantity} x {formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-zinc-900">{formatCurrency(item.quantity * item.price)}</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Taxes & Financial adjustments */}
          <div className="glass-card bg-white p-6 border border-zinc-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">
              <Percent className="w-4 h-4 text-red-800" />
              Impuestos y Descuentos
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Impuesto / ITBIS / IVA (%)</label>
                <select 
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                >
                  <option value={0}>Sin impuestos (0%)</option>
                  <option value={18}>ITBIS General (18%)</option>
                  <option value={16}>IVA Reducido (16%)</option>
                  <option value={10}>Servicios de Hospedaje (10%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Descuento Directo (RD$)</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Moneda</label>
                <div className="flex gap-2">
                  {['RD$', 'US$', 'EUR'].map(curr => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => handleCurrencyChange(curr)}
                      className={cn(
                        "flex-1 py-1.5 border rounded-xl text-xs font-bold transition-all",
                        currency === curr ? "bg-red-800 border-red-805 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-650"
                      )}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Estado de Factura</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('pending')}
                    className={cn(
                      "flex-1 py-1.5 border rounded-xl text-xs font-bold transition-all",
                      status === 'pending' ? "bg-amber-100 border-amber-300 text-amber-850" : "bg-zinc-50 border-zinc-200 text-zinc-650"
                    )}
                  >
                    Pendiente
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('paid')}
                    className={cn(
                      "flex-1 py-1.5 border rounded-xl text-xs font-bold transition-all",
                      status === 'paid' ? "bg-green-100 border-green-300 text-green-850" : "bg-zinc-50 border-zinc-200 text-zinc-650"
                    )}
                  >
                    Cobrado
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live A4 Print Preview (Right Panel) */}
        <div className="xl:col-span-6 space-y-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">VISTA PREVIA DE FACTURA (A4 / IMPRESIÓN)</p>
          
          <div 
            id="printable-invoice-area" 
            className="p-8 md:p-12 bg-white rounded-3xl border border-zinc-200 shadow-xl max-w-2xl mx-auto space-y-8 text-zinc-800"
          >
            {/* Invoice Top header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-zinc-150 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-800 flex items-center justify-center text-white font-black text-sm uppercase">
                    {issuerName ? issuerName.trim().split(' ').map(n => n[0]).join('').substring(0, 2) : 'N'}
                  </div>
                  <h4 className="text-lg font-black text-zinc-900 tracking-tight uppercase select-all">
                    {issuerName || 'Financiera Nova'}
                  </h4>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal font-semibold">
                  {issuerAddress && <>{issuerAddress}<br /></>}
                  {issuerRnc && <>RNC: <span className="select-all">{issuerRnc}</span></>}
                  {issuerPhone && <> • Tel: <span className="select-all">{issuerPhone}</span></>}
                  {issuerEmail && <><br /><span className="select-all">{issuerEmail}</span></>}
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className={cn(
                  "inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-2",
                  status === 'paid' ? "bg-green-50 text-green-700 border border-green-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                )}>
                  {status === 'paid' ? 'COBRADA / COMPLETA' : 'PENDIENTE DE PAGO'}
                </span>
                <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Factura de Activo</h5>
                <p className="text-base font-black text-zinc-900">{invoiceNumber}</p>
              </div>
            </div>

            {/* Invoicing info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5">Facturado A:</p>
                <p className="text-sm font-black text-zinc-900 select-all">{clientName || '(Por favor ingrese nombre del cliente)'}</p>
                {clientRnc && <p className="text-zinc-500 mt-1">RNC/Cédula: <span className="font-semibold text-zinc-800 select-all">{clientRnc}</span></p>}
                {clientEmail && <p className="text-zinc-500">Email: <span className="font-semibold text-zinc-800 select-all">{clientEmail}</span></p>}
              </div>

              <div className="sm:text-right space-y-1.5 text-zinc-500">
                <p><span className="font-medium text-zinc-400 block sm:inline">Fecha Emisión:</span> <strong className="text-zinc-800">{new Date(issueDate).toLocaleDateString()}</strong></p>
                <p><span className="font-medium text-zinc-400 block sm:inline">Fecha Vencimiento:</span> <strong className="text-zinc-800">{new Date(dueDate).toLocaleDateString()}</strong></p>
                <p><span className="font-medium text-zinc-400 block sm:inline">Tasa Impuesto:</span> <strong className="text-zinc-800">{taxRate}% ITBIS</strong></p>
              </div>
            </div>

            {/* Invoice Line Items list grid */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Descripción / Concepto</th>
                  <th className="py-2.5 text-center w-16">Cant.</th>
                  <th className="py-2.5 text-right w-24">Precio Unit.</th>
                  <th className="py-2.5 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <tr key={item.id} className="text-zinc-800">
                    <td className="py-3 font-semibold text-zinc-900">{item.description}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{currency} {item.price.toLocaleString()}</td>
                    <td className="py-3 text-right font-bold text-zinc-900">{currency} {(item.quantity * item.price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Box */}
            <div className="flex flex-col items-end pt-4 border-t border-zinc-200 text-xs">
              <div className="w-full sm:w-64 space-y-2 font-medium">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal:</span>
                  <span className="text-zinc-900">{currency} {subtotal.toLocaleString()}</span>
                </div>
                
                {taxAmount > 0 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>ITBIS ({taxRate}%):</span>
                    <span className="text-zinc-900">{currency} {taxAmount.toLocaleString()}</span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex justify-between text-red-750">
                    <span>Descuento Aplicado:</span>
                    <span>-{currency} {discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-red-800 border-t border-zinc-150 pt-2 text-right">
                  <span>TOTAL NETO:</span>
                  <span>{currency} {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer notice print only */}
            <div className="border-t border-zinc-150 pt-6 text-center space-y-1.5">
              <p className="text-[10px] text-zinc-400 leading-relaxed font-semibold uppercase tracking-wider">
                Gracias por confiar en {issuerName || 'Financiera Nova'}.
              </p>
              <p className="text-[9px] text-zinc-400">
                Esta factura constituye un documento financiero legal estructurado bajo los estándares de {issuerName || 'Financiera Nova'}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Invoices List History - Real Persistence */}
      <div className="glass-card bg-white p-6 border border-zinc-150 rounded-3xl shadow-sm space-y-6 mt-8 no-print" id="saved-invoices-history-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-red-800" />
            <div>
              <h3 className="text-sm font-bold text-zinc-850 uppercase tracking-wider">Historial de Facturas Guardadas</h3>
              <p className="text-[11px] text-zinc-400 font-medium">Visualice, cargue o elimine facturas emitidas anteriormente en Financiera Nova.</p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Buscar por cliente o código..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-800 focus:bg-white transition-all font-semibold"
              value={savedSearchTerm}
              onChange={(e) => setSavedSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Saved Invoices Grid / List */}
        {savedInvoices.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-2xl">
            <ReceiptText className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <p className="font-bold">No tiene facturas guardadas en el historial local.</p>
            <p className="text-[10px] text-zinc-400 mt-1">Haga una factura arriba y presione "Guardar Factura" para que aparezca aquí.</p>
          </div>
        ) : (
          (() => {
            const listFiltered = savedInvoices.filter(inv => {
              const term = savedSearchTerm.toLowerCase();
              return (
                inv.clientName.toLowerCase().includes(term) ||
                inv.invoiceNumber.toLowerCase().includes(term) ||
                (inv.clientRnc && inv.clientRnc.includes(term))
              );
            });

            if (listFiltered.length === 0) {
              return (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No se encontraron facturas con la búsqueda "{savedSearchTerm}".
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {listFiltered.map(inv => (
                  <div 
                    key={inv.id}
                    onClick={() => handleLoadInvoice(inv)}
                    className="p-4 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-150 hover:border-red-200 rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-4 group relative"
                    title="Click para ver/cargar esta factura en el editor"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-100 select-all">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-bold block mt-1">Emitida: {new Date(inv.issueDate).toLocaleDateString()}</span>
                        </div>

                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                          inv.status === 'paid' ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {inv.status === 'paid' ? 'Cobrada' : 'Pendiente'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-zinc-950 uppercase truncate select-all">{inv.clientName}</h4>
                        {inv.clientRnc && (
                          <p className="text-[10px] text-zinc-400 font-bold select-all">RNC: {inv.clientRnc}</p>
                        )}
                        <p className="text-[10px] text-zinc-500 font-medium mt-1 truncate">
                          Conceptos: <strong className="text-zinc-700">{inv.items.map(it => it.description).join(', ')}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-zinc-150 text-xs">
                      <div>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Total Neto</p>
                        <strong className="text-sm font-black text-red-800">{inv.currency} {inv.grandTotal.toLocaleString()}</strong>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold text-red-800 hover:underline">Ver / Cargar &rarr;</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedInvoice(inv.id, e)}
                          className="p-1.5 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-2"
                          title="Eliminar de historial"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>

    </div>
  );
}
