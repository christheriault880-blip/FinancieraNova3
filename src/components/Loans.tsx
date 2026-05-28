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
import { subscribeToInventory, updateInventoryItem, addTransaction, subscribeToLoans, addLoan, deleteLoanInFirestore, updateLoanInFirestore } from '../services/firestoreService';
import { InventoryItem, Loan } from '../types';

export default function Loans() {
  const { user } = useAuth();
  
  // States
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);

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
  const [selectedInventoryQty, setSelectedInventoryQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  // Confirmation state for operations to avoid blocked iframe dialogs
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loanToMarkPaid, setLoanToMarkPaid] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loanToDeleteId, setLoanToDeleteId] = useState<string | null>(null);

  // Subscribe to real-time Loans list from Firestore
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToLoans(user.uid, async (data) => {
      if (data.length === 0) {
        // Migration check from localStorage
        const saved = localStorage.getItem('nova_loans_list');
        if (saved) {
          try {
            const localLoans: any[] = JSON.parse(saved);
            if (localLoans.length > 0) {
              console.log('Migrating local loans to firestore...');
              for (const l of localLoans) {
                await addLoan(user.uid, {
                  partnerRnc: l.partnerRnc,
                  partnerName: l.partnerName,
                  hasGuarantor: l.hasGuarantor,
                  guarantorName: l.guarantorName,
                  amount: l.amount,
                  taxRate: l.taxRate,
                  moraValue: l.moraValue,
                  moraType: l.moraType,
                  inventoryItemId: l.inventoryItemId || null || undefined,
                  inventoryItemName: l.inventoryItemName || null || undefined,
                  date: l.date,
                  dueDate: l.dueDate || null || undefined,
                  notes: l.notes || null || undefined
                });
              }
              localStorage.removeItem('nova_loans_list');
            }
          } catch (e) {
            console.error('Error migrating local loans:', e);
          }
        }
      }
      setLoans(data);
      setLoadingLoans(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Subscribe to real space inventory
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, (data) => {
      setInventoryItems(data);
      setLoadingInventory(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Filter inventory items that have positive stock (available to be given/loaned out)
  const availableInventoryItems = inventoryItems.filter(item => {
    return (item.stock ?? 0) > 0;
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

    const loanData: Omit<Loan, 'id' | 'uid'> = {
      partnerRnc: partnerRnc.trim(),
      partnerName: partnerName.trim(),
      hasGuarantor,
      guarantorName: hasGuarantor ? guarantorName.trim() : undefined,
      amount: Number(amount),
      taxRate: Number(taxRate) || 0,
      moraValue: Number(moraValue) || 0,
      moraType,
      inventoryItemId: linkedItem?.id || undefined,
      inventoryItemName: linkedItem?.name || undefined,
      inventoryItemQty: linkedItem ? selectedInventoryQty : undefined,
      date: date || new Date().toISOString().split('T')[0],
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined
    };

    try {
      // 1. Save new loan to Firestore database
      await addLoan(user.uid, loanData);

      // 2. If an inventory item was selected, we update its stock level in Firestore
      if (linkedItem) {
        try {
          const currentStock = linkedItem.stock || 0;
          const updatedStock = Math.max(0, currentStock - selectedInventoryQty);
          const updatedSold = (linkedItem.totalSold || 0) + selectedInventoryQty;
          const itemPrice = linkedItem.price || linkedItem.value || 0;
          const updatedIncome = (linkedItem.salesIncome || 0) + (itemPrice * selectedInventoryQty);

          await updateInventoryItem(user.uid, linkedItem.id, {
            stock: updatedStock,
            totalSold: updatedSold,
            salesIncome: updatedIncome
          });

          // Register transaction in ledger for transparency
          await addTransaction(user.uid, {
            amount: Number(amount),
            category: 'Otros',
            description: `Garantía de Préstamo - ${selectedInventoryQty}x ${linkedItem.name} entregado a socio ${partnerName}`,
            date: new Date().toISOString(),
            type: 'income'
          });
        } catch (err) {
          console.error('Error al descontar activo para el préstamo:', err);
        }
      }
    } catch (err) {
      console.error('Error al crear el préstamo en Firestore:', err);
      alert('Error al guardar el préstamo. Por favor intente nuevamente.');
      return;
    }
    
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
    setSelectedInventoryQty(1);
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
  };

  // Handle removing a Loan
  const handleDeleteLoan = (loanId: string) => {
    setLoanToDeleteId(loanId);
    setShowDeleteModal(true);
  };

  // Handle marking a Loan as paid in full
  const handleMarkAsPaid = (loanId: string) => {
    setLoanToMarkPaid(loanId);
    setShowConfirmModal(true);
  };

  // Calculate stats
  const totalLoanedCapital = loans.reduce((sum, l) => sum + l.amount, 0);
  const pendingBalance = loans.filter(l => l.status !== 'paid').reduce((sum, l) => sum + l.amount, 0);
  const activeLoansCount = loans.filter(l => l.status !== 'paid').length;
  const itemsOnLoanCount = loans.filter(l => l.status !== 'paid').reduce((sum, l) => {
    if (l.inventoryItemId) {
      return sum + (l.inventoryItemQty || 1);
    }
    return sum;
  }, 0);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cartera Otorgada Total</p>
            <p className="text-2xl font-black text-red-800">{formatCurrency(totalLoanedCapital)}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-800">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Balance Pendiente</p>
            <p className="text-2xl font-black text-amber-600">{formatCurrency(pendingBalance)}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Préstamos Pendientes</p>
            <p className="text-2xl font-black text-zinc-950">{activeLoansCount}</p>
          </div>
          <div className="p-3 bg-zinc-50 rounded-xl text-zinc-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card bg-white p-5 border border-zinc-150 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Activos en Garantía / Cedidos</p>
            <p className="text-lg font-black text-zinc-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-zinc-600" />
              {itemsOnLoanCount} unidades
            </p>
          </div>
          <div className="p-3 bg-zinc-50 rounded-xl text-zinc-800">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fecha de Emisión *</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fecha de Vencimiento (Opcional)</label>
              <input 
                type="date"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
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
                <span className="text-xs font-black text-red-800 flex items-center gap-1 uppercase tracking-wide">
                  <Boxes className="w-4 h-4 text-red-700" />
                  ¿Vincular un Producto de tu Inventario al Préstamo?
                </span>
                <span className="text-[10px] text-zinc-400 block">Seleccione un activo físico o bien de su catálogo para bloquearlo en garantía durante la vigencia de este préstamo.</span>
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
                    onChange={e => {
                      const selId = e.target.value;
                      setSelectedInventoryId(selId);
                      setSelectedInventoryQty(1);
                      if (selId) {
                        const matched = availableInventoryItems.find(item => item.id === selId);
                        if (matched) {
                          // Automatically set the loan amount to the value of the active product!
                          setAmount(String(matched.price || matched.value || ''));
                        }
                      }
                    }}
                  >
                    <option value="">-- No vincular activo / producto --</option>
                    {availableInventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({formatCurrency(item.value)}) (Stock: {item.stock ?? 0})
                      </option>
                    ))}
                  </select>

                  {/* Quantity selection block */}
                  {(() => {
                    const selectedItemData = selectedInventoryId 
                      ? availableInventoryItems.find(item => item.id === selectedInventoryId)
                      : null;
                    if (!selectedItemData) return null;

                    return (
                      <div className="mt-2.5 p-3 bg-red-50/50 border border-red-100 rounded-2xl space-y-2.5 animate-fade-in text-zinc-900">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-red-900 uppercase tracking-wide">Cantidad de entrega:</span>
                          <span className="text-[10px] text-zinc-500 font-bold">
                            Disponible: <strong className="text-zinc-800 font-extrabold">{selectedItemData.stock ?? 1} unidades</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={selectedInventoryQty <= 1}
                            onClick={() => {
                              const newQty = Math.max(1, selectedInventoryQty - 1);
                              setSelectedInventoryQty(newQty);
                              const unitPrice = selectedItemData.price || selectedItemData.value || 0;
                              setAmount(String(unitPrice * newQty));
                            }}
                            className="w-8 h-8 rounded-xl bg-white border border-zinc-200 text-zinc-800 font-black hover:bg-zinc-100 flex items-center justify-center disabled:opacity-40 transition-all text-sm active:scale-95 shadow-sm"
                          >
                            -
                          </button>
                          
                          <input
                            type="number"
                            min="1"
                            max={selectedItemData.stock ?? 1}
                            className="w-16 text-center py-1.5 border border-zinc-200 rounded-xl text-xs font-black focus:outline-none focus:ring-1 focus:ring-red-800 bg-white"
                            value={selectedInventoryQty}
                            onChange={e => {
                              const limit = selectedItemData.stock ?? 1;
                              const newQty = Math.max(1, Math.min(limit, Number(e.target.value)));
                              setSelectedInventoryQty(newQty);
                              const unitPrice = selectedItemData.price || selectedItemData.value || 0;
                              setAmount(String(unitPrice * newQty));
                            }}
                          />

                          <button
                            type="button"
                            disabled={selectedInventoryQty >= (selectedItemData.stock ?? 1)}
                            onClick={() => {
                              const limit = selectedItemData.stock ?? 1;
                              const newQty = Math.min(limit, selectedInventoryQty + 1);
                              setSelectedInventoryQty(newQty);
                              const unitPrice = selectedItemData.price || selectedItemData.value || 0;
                              setAmount(String(unitPrice * newQty));
                            }}
                            className="w-8 h-8 rounded-xl bg-white border border-zinc-200 text-zinc-800 font-black hover:bg-zinc-100 flex items-center justify-center disabled:opacity-40 transition-all text-sm active:scale-95 shadow-sm"
                          >
                            +
                          </button>

                          <div className="ml-auto text-right pr-1">
                            <span className="text-[9px] text-zinc-400 block font-bold uppercase tracking-wider">Subtotal Activo</span>
                            <span className="text-xs font-black text-red-800">
                              {formatCurrency((selectedItemData.price || selectedItemData.value || 0) * selectedInventoryQty)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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

                  {/* Status Badge */}
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border",
                    loan.status === 'paid'
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  )}>
                    {loan.status === 'paid' ? 'Pago Completo / Cobrado' : 'Pendiente de Pago'}
                  </span>
                </div>

                {/* Main financial properties */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 border-t border-zinc-100 text-xs text-zinc-500 font-medium">
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

                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Vencimiento</span>
                    <span className={cn(
                      "font-semibold",
                      loan.dueDate ? "text-red-800 font-black" : "text-zinc-500"
                    )}>
                      {loan.dueDate || 'No fijada'}
                    </span>
                  </div>
                </div>

                {/* Linked inventory assets */}
                {loan.inventoryItemId && (
                  <div className="p-3 bg-red-50 text-red-950 border border-red-100 rounded-xl flex items-center justify-between text-xs font-semibold mt-2 max-w-xl">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-red-800" />
                      <span>Unidades Vendidas / Entregadas:</span>
                      <strong className="text-red-950 font-black decoration-dotted underline select-all">{loan.inventoryItemQty || 1}x {loan.inventoryItemName}</strong>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-200">
                      Entregado
                    </span>
                  </div>
                )}

                {loan.notes && (
                  <p className="text-[11px] text-zinc-400 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 max-w-2xl leading-normal font-sans">
                    <strong>Pautas:</strong> {loan.notes}
                  </p>
                )}
              </div>

              {/* Action buttons (Cobrado & Delete) */}
              <div className="self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100 flex items-center gap-2 justify-end w-full md:w-auto">
                {loan.status !== 'paid' && (
                  <button
                    onClick={() => handleMarkAsPaid(loan.id)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-1.5 text-[11.5px] font-black shadow-sm active:scale-95"
                    title="Marcar préstamo como Pago completo / Cobrado"
                  >
                    <Check className="w-4 h-4 text-emerald-700 font-extrabold" />
                    <span>Marcar Cobrado</span>
                  </button>
                )}
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

      {/* Confirmation Modal: Mark Paid */}
      {showConfirmModal && loanToMarkPaid && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white p-6 rounded-3xl border border-zinc-150 max-w-sm w-full space-y-4 shadow-xl text-zinc-900">
            <div className="flex items-center gap-3 text-emerald-800">
              <div className="p-2.5 bg-emerald-50 rounded-full">
                <Check className="w-5 h-5 text-emerald-700 font-black" />
              </div>
              <h4 className="font-black text-sm uppercase tracking-wider text-emerald-950">¿Confirmar Pago?</h4>
            </div>
            <p className="text-xs text-zinc-650 leading-normal font-medium">
              ¿Confirmar que este préstamo ha sido pagado / cobrado por completo? El balance pendiente se reducirá a **RD$ 0** y la garantía quedará liberada.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setLoanToMarkPaid(null);
                }}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  try {
                    await updateLoanInFirestore(user.uid, loanToMarkPaid, { status: 'paid' });
                  } catch (err) {
                    console.error('Error al actualizar el préstamo a cobrado:', err);
                  } finally {
                    setShowConfirmModal(false);
                    setLoanToMarkPaid(null);
                  }
                }}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
              >
                Sí, Cobrado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Loan */}
      {showDeleteModal && loanToDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white p-6 rounded-3xl border border-zinc-150 max-w-sm w-full space-y-4 shadow-xl text-zinc-900">
            <div className="flex items-center gap-3 text-red-800">
              <div className="p-2.5 bg-red-50 rounded-full">
                <Trash2 className="w-5 h-5 text-red-700" />
              </div>
              <h4 className="font-black text-sm uppercase tracking-wider text-red-950">¿Eliminar Registro?</h4>
            </div>
            <p className="text-xs text-zinc-650 leading-normal font-medium">
              ¿Está seguro de eliminar o dar por finalizado este contrato de préstamo? Esta acción es irreversible.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setLoanToDeleteId(null);
                }}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  try {
                    await deleteLoanInFirestore(user.uid, loanToDeleteId);
                  } catch (err) {
                    console.error('Error al eliminar préstamo:', err);
                  } finally {
                    setShowDeleteModal(false);
                    setLoanToDeleteId(null);
                  }
                }}
                className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
