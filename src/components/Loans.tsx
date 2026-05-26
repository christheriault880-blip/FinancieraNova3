import { useState, useEffect } from 'react';
import { 
  Coins, 
  User, 
  Plus, 
  Trash2, 
  Check, 
  Shield, 
  ShieldAlert, 
  FileText, 
  Search, 
  X, 
  Lock, 
  Unlock, 
  Building, 
  Clock, 
  AlertTriangle,
  Boxes,
  Percent,
  TrendingDown
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { subscribeToInventory, updateInventoryItemNotes } from '../services/firestoreService';
import { InventoryItem } from '../types';

interface Loan {
  id: string;
  partnerRnc: string;
  partnerName: string;
  hasGuarantor: boolean;
  guarantorName?: string;
  amount: number;
  taxRate: number; // Impuesto / Interés (%)
  moraValue: number; // Mora
  moraType: 'fixed' | 'percentage'; // Fijo o Porcentual
  inventoryItemId?: string; // ID del activo de inventario vinculado
  inventoryItemName?: string; // Nombre del activo vinculado
  date: string;
  notes?: string;
}

export default function Loans() {
  const { user } = useAuth();
  
  // States
  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('nova_loans_list');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'loan-1',
        partnerRnc: '1-02-45811-9',
        partnerName: 'Juan Bautista Gómez',
        hasGuarantor: true,
        guarantorName: 'Marcos Aurelio Pérez',
        amount: 150000,
        taxRate: 12,
        moraValue: 2000,
        moraType: 'fixed',
        date: new Date().toISOString().split('T')[0],
        notes: 'Garantía prendaria regularizada. Cuotas los 25 de cada mes.'
      }
    ];
  });

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  
  // Search and form states
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // New Loan Form fields
  const [partnerRnc, setPartnerRnc] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [hasGuarantor, setHasGuarantor] = useState(false);
  const [guarantorName, setGuarantorName] = useState('');
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState('18'); // Default tax (can represent ITBIS or regular interest rate)
  const [moraValue, setMoraValue] = useState('500'); // Default mora/late fee
  const [moraType, setMoraType] = useState<'fixed' | 'percentage'>('fixed');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [notes, setNotes] = useState('');

  // Persist loans list to localStorage
  useEffect(() => {
    localStorage.setItem('nova_loans_list', JSON.stringify(loans));
  }, [loans]);

  // Subscribe to real space inventory
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, (data) => {
      setInventoryItems(data);
      setLoadingInventory(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Filter out inventory items that are currently "En Préstamo" (already locked)
  // We identify them by reading the `[EN PRÉSTAMO]` prefix in notes
  const availableInventoryItems = inventoryItems.filter(item => {
    return !item.notes?.includes('[EN PRÉSTAMO]');
  });

  // Handle adding a new Loan
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!partnerRnc || !partnerName || !amount) return;

    let linkedItem: InventoryItem | undefined;
    if (selectedInventoryId) {
      linkedItem = inventoryItems.find(item => item.id === selectedInventoryId);
    }

    const newLoan: Loan = {
      id: 'loan-' + Math.random().toString(36).substr(2, 9),
      partnerRnc: partnerRnc.trim(),
      partnerName: partnerName.trim(),
      hasGuarantor,
      guarantorName: hasGuarantor ? guarantorName.trim() : undefined,
      amount: Number(amount),
      taxRate: Number(taxRate) || 0,
      moraValue: Number(moraValue) || 0,
      moraType,
      inventoryItemId: linkedItem?.id,
      inventoryItemName: linkedItem?.name,
      date: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined
    };

    // If an inventory item was selected, let's update its notes in Firestore database
    if (linkedItem) {
      try {
        const originalNotes = linkedItem.notes || '';
        const newNotesPrefix = `[EN PRÉSTAMO] Vinculado al socio ${partnerName} (RNC: ${partnerRnc}). `;
        const updatedNotes = originalNotes 
          ? `${newNotesPrefix}${originalNotes}` 
          : newNotesPrefix;
        
        await updateInventoryItemNotes(user.uid, linkedItem.id, updatedNotes);
      } catch (err) {
        console.error('Error al actualizar notas del activo en firebase:', err);
      }
    }

    setLoans([newLoan, ...loans]);
    
    // Close & Reset
    setShowForm(false);
    setPartnerRnc('');
    setPartnerName('');
    setHasGuarantor(false);
    setGuarantorName('');
    setAmount('');
    setTaxRate('18');
    setMoraValue('500');
    setMoraType('fixed');
    setSelectedInventoryId('');
    setNotes('');
  };

  // Handle removing a Loan ("X" on the side)
  const handleDeleteLoan = async (loanId: string) => {
    if (!user) return;
    const confirmDelete = window.confirm('¿Está seguro de eliminar o dar por finalizado este préstamo?');
    if (!confirmDelete) return;

    const loanToRemove = loans.find(l => l.id === loanId);
    
    // If it had a linked inventory item, let's unlock it!
    if (loanToRemove && loanToRemove.inventoryItemId) {
      const dbItem = inventoryItems.find(item => item.id === loanToRemove.inventoryItemId);
      if (dbItem) {
        try {
          // Remove the "[EN PRÉSTAMO] ..." text from notes to restore original notes
          const cleanedNotes = dbItem.notes 
            ? dbItem.notes.replace(/\[EN PRÉSTAMO\][^\.]*\.\s?/, '') 
            : '';
          
          await updateInventoryItemNotes(user.uid, dbItem.id, cleanedNotes);
        } catch (err) {
          console.error('Error al liberar activo del inventario:', err);
        }
      }
    }

    setLoans(loans.filter(l => l.id !== loanId));
  };

  // Calculate stats
  const totalLoanedCapital = loans.reduce((sum, l) => sum + l.amount, 0);
  const activeLoansCount = loans.length;
  const itemsOnLoanCount = loans.filter(l => l.inventoryItemId).length;

  const filteredLoans = loans.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      l.partnerName.toLowerCase().includes(term) ||
      l.partnerRnc.includes(term) ||
      (l.guarantorName && l.guarantorName.toLowerCase().includes(term)) ||
      (l.inventoryItemName && l.inventoryItemName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 animate-fade-in" id="loans-section-container">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Gestión de Préstamos</h2>
          <p className="text-zinc-500">
            Controla préstamos a socios, tasas impositivas, garantes asociados y sincroniza activos en garantía del inventario.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md",
            showForm 
              ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 shadow-none border border-zinc-200" 
              : "bg-red-800 hover:bg-red-900 text-white shadow-red-100"
          )}
        >
          {showForm ? (
            <>
              <X className="w-4 h-4" />
              Cerrar Formulario
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Registrar Nuevo Préstamo
            </>
          )}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Capital de Cartera Otorgado</p>
            <p className="text-2xl font-black text-red-800">{formatCurrency(totalLoanedCapital)}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-800">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contratos de Préstamo Activos</p>
            <p className="text-2xl font-black text-zinc-950">{activeLoansCount}</p>
          </div>
          <div className="p-3 bg-zinc-50 rounded-xl text-zinc-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Activos de Inventario Cedidos</p>
            <p className="text-lg font-black text-amber-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-600" />
              {itemsOnLoanCount} bienes bloqueados
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-800">
            <Boxes className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Loan Form */}
      {showForm && (
        <form onSubmit={handleCreateLoan} className="bg-white p-6 border border-zinc-150 rounded-3xl shadow-lg space-y-6 animate-slide-up">
          <div className="pb-3 border-b border-zinc-100 flex items-center gap-2">
            <Coins className="w-5 h-5 text-red-800" />
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Establecer Ficha de Crédito / Préstamo</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nombre Completo del Socio / Cliente *</label>
              <input 
                type="text"
                required
                placeholder="Ej: Marcos Ramírez Silverio"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cédula o RNC del Socio *</label>
              <input 
                type="text"
                required
                placeholder="Ej: 1-01-88432-1"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                value={partnerRnc}
                onChange={e => setPartnerRnc(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Monto Solicitado (RD$) *</label>
              <input 
                type="number"
                required
                min="100"
                placeholder="Monto del préstamo"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none font-bold"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Impuesto / Tasa de Interés (%)</label>
              <input 
                type="number"
                placeholder="Ej: 18 (ITBIS o Interés mensual)"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Mora por Retraso</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  placeholder="Ej: 500 o 2"
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                  value={moraValue}
                  onChange={e => setMoraValue(e.target.value)}
                />
                <select
                  className="px-2.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                  value={moraType}
                  onChange={e => setMoraType(e.target.value as any)}
                >
                  <option value="fixed">Fijo (RD$)</option>
                  <option value="percentage">Mora %</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-150">
            {/* Guarantor Setting */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-800 block">¿Posee un Garante Solidario?</span>
                  <span className="text-[10px] text-zinc-400 block">Indica si otro miembro respalda el préstamo.</span>
                </div>
                <input 
                  type="checkbox"
                  className="w-4.5 h-4.5 text-red-800 rounded focus:ring-red-800"
                  checked={hasGuarantor}
                  onChange={e => setHasGuarantor(e.target.checked)}
                />
              </div>

              {hasGuarantor && (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nombre Completo del Garante *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej: Esteban Duarte Castillo"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                    value={guarantorName}
                    onChange={e => setGuarantorName(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Linkage with inventory setting */}
            <div className="space-y-3 border-t md:border-t-0 md:border-l border-zinc-200 pt-3 md:pt-0 md:pl-6">
              <div>
                <span className="text-xs font-bold text-zinc-800 block">¿Prestar Activo Propio del Inventario?</span>
                <span className="text-[10px] text-zinc-400 block">Bloqueará temporalmente el activo seleccionado en tu Inventario.</span>
              </div>

              {loadingInventory ? (
                <span className="text-xs text-zinc-400 block">Cargando catálogo...</span>
              ) : availableInventoryItems.length === 0 ? (
                <div className="p-2 bg-amber-50 text-amber-800 text-[10px] font-semibold rounded-xl border border-amber-100">
                  ⚠️ No tienes activos de inventario registrados o todos están actualmente en préstamo.
                </div>
              ) : (
                <div>
                  <select
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                    value={selectedInventoryId}
                    onChange={e => setSelectedInventoryId(e.target.value)}
                  >
                    <option value="">-- No vincular activo --</option>
                    {availableInventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({formatCurrency(item.value)}) ({item.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Condiciones Especiales / Comentarios</label>
            <textarea 
              rows={2}
              placeholder="Ej: Pago total estimado en 12 cuotas quincenales consecutivas..."
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold rounded-xl"
            >
              Registrar Préstamo
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search catalog */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input 
          type="text"
          placeholder="Filtrar préstamos por socio, cédula/RNC, garante o activo..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-800 transition-all font-medium"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Loans Grid / list display */}
      <div className="space-y-4">
        {filteredLoans.length === 0 ? (
          <div className="glass-card bg-white p-12 text-center rounded-2xl border border-dashed border-zinc-200">
            <Coins className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 text-xs font-bold">No hay préstamos con la búsqueda actual.</p>
            <p className="text-zinc-400 text-[10px] mt-1">Usa "Registrar Nuevo Préstamo" arriba para crear uno.</p>
          </div>
        ) : (
          filteredLoans.map(loan => (
            <div 
              key={loan.id}
              className="p-5 sm:p-6 bg-white border border-zinc-150 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group"
            >
              <div className="space-y-3 flex-1">
                {/* Partner Header */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                    {loan.partnerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-zinc-900 tracking-tight flex items-center gap-1.5 uppercase select-all">
                      {loan.partnerName}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-bold select-all">RNC/Cédula: {loan.partnerRnc}</p>
                  </div>

                  {/* Guarantor badge status */}
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ml-auto md:ml-2.5",
                    loan.hasGuarantor 
                      ? "bg-green-50 text-green-700 border border-green-100" 
                      : "bg-zinc-50 text-zinc-500 border border-zinc-150"
                  )}>
                    {loan.hasGuarantor ? (
                      <>
                        <Shield className="w-3 h-3 text-green-600" />
                        Garante: {loan.guarantorName}
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3 h-3 text-zinc-400" />
                        Sin garante
                      </>
                    )}
                  </span>
                </div>

                {/* Main financial properties */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-zinc-100 text-xs text-zinc-500 font-medium">
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Capital Prestado</span>
                    <strong className="text-base font-black text-red-800">{formatCurrency(loan.amount)}</strong>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Impuesto / Tasa</span>
                    <strong className="text-zinc-800 font-semibold">{loan.taxRate}% de recargo</strong>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Mora Registrada</span>
                    <strong className="text-zinc-800 font-semibold">
                      {loan.moraType === 'fixed' ? 'RD$ ' : ''}
                      {loan.moraValue}
                      {loan.moraType === 'percentage' ? '%' : ''}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Fecha Emisión</span>
                    <span className="text-zinc-700 font-semibold">{loan.date}</span>
                  </div>
                </div>

                {/* Linked inventory assets */}
                {loan.inventoryItemId && (
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between text-xs font-semibold text-amber-900 mt-2 max-w-xl">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 animate-pulse" />
                      <span>Activo Bloqueado en Inventario:</span>
                      <strong className="text-amber-950 font-black decoration-dotted underline select-all">{loan.inventoryItemName}</strong>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      En Préstamo
                    </span>
                  </div>
                )}

                {loan.notes && (
                  <p className="text-[11px] text-zinc-400 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 max-w-2xl leading-normal font-sans">
                    <strong>Pautas:</strong> {loan.notes}
                  </p>
                )}
              </div>

              {/* Action buttons (The X button to delete) */}
              <div className="self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100 flex items-center justify-end w-full md:w-auto">
                <button
                  onClick={() => handleDeleteLoan(loan.id)}
                  className="p-2 text-zinc-400 hover:text-red-800 hover:bg-red-50 rounded-full transition-all flex items-center gap-1 text-[11px] font-bold border border-transparent hover:border-red-100"
                  title="Eliminar registro de préstamo / Liberar activo"
                >
                  <X className="w-5 h-5 text-red-700" />
                  <span className="md:hidden">Eliminar Préstamo</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
