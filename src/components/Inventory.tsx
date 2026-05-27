import { useState, useEffect } from 'react';
import { 
  Building, 
  Car, 
  Smartphone, 
  Wrench, 
  Package, 
  Plus, 
  Trash2, 
  MapPin, 
  Calendar, 
  FileText, 
  Search, 
  Boxes,
  X,
  TrendingUp,
  AlertCircle,
  ShoppingCart,
  PlusCircle,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Tag,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { 
  subscribeToInventory, 
  addInventoryItem, 
  deleteInventoryItem, 
  updateInventoryItem, 
  addTransaction,
  subscribeToDailySummaries,
  addDailySummary,
  deleteDailySummary
} from '../services/firestoreService';
import { InventoryItem, DailySalesSummary } from '../types';

const categoryIcons: Record<string, any> = {
  'Inmuebles': Building,
  'Vehículos': Car,
  'Tecnología': Smartphone,
  'Equipamiento': Wrench,
  'Otros': Package,
  'Alimentos': Package,
  'Bebidas': Package,
  'Limpieza': Package,
};

const categoryColors: Record<string, string> = {
  'Inmuebles': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Vehículos': 'bg-blue-50 text-blue-600 border-blue-100',
  'Tecnología': 'bg-purple-50 text-purple-600 border-purple-100',
  'Equipamiento': 'bg-amber-50 text-amber-600 border-amber-100',
  'Otros': 'bg-zinc-50 text-zinc-600 border-zinc-100',
  'Alimentos': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Bebidas': 'bg-rose-50 text-rose-600 border-rose-100',
  'Limpieza': 'bg-cyan-50 text-cyan-600 border-cyan-100',
};

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | 'All'>('All');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Custom Toasts or status banners
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Dynamic Custom Categories
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('nova_inventory_categories');
    if (saved) return JSON.parse(saved);
    return ['Otros', 'Alimentos', 'Bebidas', 'Limpieza', 'Tecnología', 'Equipamiento', 'Inmuebles', 'Vehículos'];
  });

  // Custom Category Dialog states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);

  const handleCreateCategory = () => {
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName || !newCategoryName.trim()) {
      setCategoryModalError("Por favor ingrese un nombre.");
      return;
    }
    const capitalized = newCategoryName.trim().charAt(0).toUpperCase() + newCategoryName.trim().slice(1);
    if (categoriesList.includes(capitalized)) {
      setCategoryModalError("Esta categoría ya existe.");
      return;
    }
    const updated = [...categoriesList, capitalized];
    setCategoriesList(updated);
    localStorage.setItem('nova_inventory_categories', JSON.stringify(updated));
    setNewItem(prev => ({ ...prev, category: capitalized })); // Auto select newly created category!
    setNewCategoryName('');
    setCategoryModalError(null);
    setIsCategoryModalOpen(false);
    
    // Auto show a temporary toast feedback
    setSuccessToast(`Categoría "${capitalized}" creada con éxito.`);
  };

  // Custom Delete confirmation states
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Quick Sales Modal states (Colmado POS)
  const [sellingItem, setSellingItem] = useState<InventoryItem | null>(null);
  const [saleQty, setSaleQty] = useState(1);
  const [salePriceOverride, setSalePriceOverride] = useState(0);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleProcessing, setSaleProcessing] = useState(false);

  // Custom Quick Restock Modal states (Surtido)
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockCostOverride, setRestockCostOverride] = useState(0);
  const [restockError, setRestockError] = useState<string | null>(null);
  const [restockProcessing, setRestockProcessing] = useState(false);

  // Daily Summaries States
  const [inventorySubTab, setInventorySubTab] = useState<'inventory' | 'summaries'>('inventory');
  const [dailySummaries, setDailySummaries] = useState<DailySalesSummary[]>([]);
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [isConfirmSaveSummaryOpen, setIsConfirmSaveSummaryOpen] = useState(false);
  const [isResettingCounters, setIsResettingCounters] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [selectedSummaryDate, setSelectedSummaryDate] = useState<string>(() => {
    // Current date in local timezone YYYY-MM-DD
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
  });

  // Form State for creating products
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Otros',
    value: 0,
    price: 0,
    stock: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    location: '',
    notes: ''
  });

  // Auto-expire success toast alerts
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToInventory(user.uid, (data) => {
      setItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to Daily Sales Summaries
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToDailySummaries(user.uid, (data) => {
      // Sort in descending order of date and createdAt
      const sorted = [...data].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.createdAt.localeCompare(a.createdAt);
      });
      setDailySummaries(sorted);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addInventoryItem(user.uid, {
        name: newItem.name,
        category: newItem.category,
        value: Number(newItem.value),
        price: Number(newItem.price || 0),
        stock: Number(newItem.stock || 0),
        totalSold: 0,
        salesIncome: 0,
        purchaseDate: new Date(newItem.purchaseDate + 'T12:00:00Z').toISOString(),
        location: newItem.location || undefined,
        notes: newItem.notes || undefined,
        uid: user.uid
      });
      
      const addedName = newItem.name;

      // Reset form and close modal
      setNewItem({
        name: '',
        category: 'Otros',
        value: 0,
        price: 0,
        stock: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        location: '',
        notes: ''
      });
      setIsModalOpen(false);
      
      setSuccessToast(`"${addedName}" registrado correctamente en el almacén.`);
    } catch (err) {
      console.error('Error al agregar el ítem de inventario:', err);
    }
  };

  const handleConfirmDeleteAsset = async () => {
    if (!user || !itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInventoryItem(user.uid, itemToDelete.id);
      setSuccessToast(`Producto "${itemToDelete.name}" eliminado del inventario.`);
      setItemToDelete(null);
    } catch (err) {
      console.error('Error al eliminar activo de inventario:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !sellingItem) return;

    const qty = Number(saleQty);
    if (isNaN(qty) || qty <= 0) {
      setSaleError("Por favor ingrese una cantidad de unidades válida mayor a cero.");
      return;
    }

    const currentStock = sellingItem.stock || 0;
    if (qty > currentStock) {
      setSaleError(`No hay suficiente stock disponible. Solo quedan ${currentStock} unidades en el almacén.`);
      return;
    }

    const sellPrice = Number(salePriceOverride);
    if (isNaN(sellPrice) || sellPrice < 0) {
      setSaleError("Por favor ingrese un precio de venta unitario válido mayor o igual a cero.");
      return;
    }

    const incomeAmount = sellPrice * qty;
    const updatedStock = currentStock - qty;
    const updatedSold = (sellingItem.totalSold || 0) + qty;
    const updatedIncome = (sellingItem.salesIncome || 0) + incomeAmount;

    setSaleProcessing(true);
    try {
      // 1. Update stock levels in Firestore
      await updateInventoryItem(user.uid, sellingItem.id, {
        stock: updatedStock,
        totalSold: updatedSold,
        salesIncome: updatedIncome
      });

      // 2. Automatically log an Income Transaction in finance ledger
      await addTransaction(user.uid, {
        amount: incomeAmount,
        category: 'Otros',
        description: `Venta POS: ${qty}x ${sellingItem.name} @ ${formatCurrency(sellPrice)} c/u`,
        date: new Date().toISOString(),
        type: 'income'
      });

      setSuccessToast(`¡Venta realizada con éxito! Se vendieron ${qty} unidades de "${sellingItem.name}". Ingreso de ${formatCurrency(incomeAmount)} registrado en Finanzas.`);
      setSellingItem(null);
      setSaleError(null);
    } catch (err: any) {
      console.error("Error processing sale:", err);
      setSaleError("Ocurrió un error al registrar la venta en Firestore.");
    } finally {
      setSaleProcessing(false);
    }
  };

  const handleProcessRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !restockingItem) return;

    const qty = Number(restockQty);
    if (isNaN(qty) || qty <= 0) {
      setRestockError("Por favor ingrese una cantidad válida mayor a cero.");
      return;
    }

    const unitCost = Number(restockCostOverride);
    if (isNaN(unitCost) || unitCost < 0) {
      setRestockError("Por favor ingrese un costo unitario válido.");
      return;
    }

    const costForIntake = unitCost * qty;
    const currentStock = restockingItem.stock || 0;
    const updatedStock = currentStock + qty;

    setRestockProcessing(true);
    try {
      // 1. Update stock levels in Firestore
      await updateInventoryItem(user.uid, restockingItem.id, {
        stock: updatedStock,
        value: unitCost // updates cost of acquisition
      });

      // 2. Log an Expense Transaction in finance ledger (Inversion de Surtido)
      await addTransaction(user.uid, {
        amount: costForIntake,
        category: 'Otros',
        description: `Inversión Surtido: +${qty}x ${restockingItem.name} @ ${formatCurrency(unitCost)} c/u`,
        date: new Date().toISOString(),
        type: 'expense'
      });

      setSuccessToast(`¡Surtido completado! Se ingresaron +${qty} unidades de "${restockingItem.name}". Gasto de ${formatCurrency(costForIntake)} registrado en Finanzas.`);
      setRestockingItem(null);
      setRestockError(null);
    } catch (err: any) {
      console.error("Error restocking:", err);
      setRestockError("Ocurrió un error al registrar el surtido en Firestore.");
    } finally {
      setRestockProcessing(false);
    }
  };

  const handleSaveDailySummary = async (autoResetCounters: boolean = false) => {
    if (!user) return;
    
    // Find items sold
    const soldList = items
      .filter(item => (item.totalSold || 0) > 0)
      .map(item => {
        const qty = item.totalSold || 0;
        const buyCost = item.value || 0;
        const sellPrice = item.price || buyCost;
        const income = item.salesIncome || (qty * sellPrice);
        const profit = income - (qty * buyCost);
        return {
          productId: item.id,
          name: item.name,
          category: item.category,
          quantity: qty,
          purchaseCost: buyCost,
          sellPrice: sellPrice,
          income: income,
          profit: profit
        };
      });

    if (soldList.length === 0) {
      alert("Aviso: No se han registrado ventas en el panel de control del almacén para guardar un resumen diario.");
      return;
    }

    setIsSavingSummary(true);
    try {
      const sumUnits = soldList.reduce((acc, curr) => acc + curr.quantity, 0);
      const sumIncome = soldList.reduce((acc, curr) => acc + curr.income, 0);
      const sumProfit = soldList.reduce((acc, curr) => acc + curr.profit, 0);

      await addDailySummary(user.uid, {
        uid: user.uid,
        date: selectedSummaryDate,
        createdAt: new Date().toISOString(),
        totalUnitsSold: sumUnits,
        totalIncome: sumIncome,
        totalProfit: sumProfit,
        productsSold: soldList
      });

      setSuccessToast(`¡Cierre de ventas del día (${selectedSummaryDate}) guardados en el historial!`);
      setIsConfirmSaveSummaryOpen(false);

      if (autoResetCounters) {
        await handleResetSalesCounters(true);
      }
    } catch (err) {
      console.error("Error saving daily summary:", err);
      alert("Ocurrió un error al intentar guardar el resumen de ventas.");
    } finally {
      setIsSavingSummary(false);
    }
  };

  const handleResetSalesCounters = async (silent: boolean = false) => {
    if (!user) return;
    setIsResettingCounters(true);

    try {
      const soldItems = items.filter(item => (item.totalSold || 0) > 0 || (item.salesIncome || 0) > 0);
      
      await Promise.all(
        soldItems.map(item => 
          updateInventoryItem(user.uid, item.id, {
            totalSold: 0,
            salesIncome: 0
          })
        )
      );

      if (!silent) {
        setSuccessToast("¡Todos los contadores de ventas de productos han sido restablecidos a 0 para un nuevo día!");
      }
      setIsConfirmResetOpen(false);
    } catch (err) {
      console.error("Error resetting counters:", err);
      if (!silent) {
        alert("Ocurrió un error al reiniciar los contadores de ventas.");
      }
    } finally {
      setIsResettingCounters(false);
    }
  };

  const handleDeleteSummary = async (summaryId: string) => {
    if (!user) return;
    if (!confirm("¿Está seguro de que desea eliminar permanentemente este registro del historial?")) return;

    try {
      await deleteDailySummary(user.uid, summaryId);
      setSuccessToast("Registro de historial diario eliminado correctamente.");
    } catch (err) {
      console.error("Error deleting daily summary:", err);
      alert("Ocurrió un error al eliminar el registro.");
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'All' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.category.toLowerCase().includes(search.toLowerCase()) ||
                          (item.location && item.location.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Calculate stats
  const totalAssetsCost = filteredItems.reduce((acc, curr) => acc + (curr.value * (curr.stock || 1)), 0);
  const totalSoldIncome = filteredItems.reduce((acc, curr) => acc + (curr.salesIncome || 0), 0);
  const lowStockItemsCount = filteredItems.filter(item => (item.stock !== undefined && item.stock <= 5)).length;

  return (
    <div id="inventory-container" className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Inventario y Almacén</h2>
          <p className="text-zinc-500">Registra bienes y mercadería, controla entradas de stock, salidas por venta y niveles de inventario disponible.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleCreateCategory}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4 text-zinc-555" />
            Nueva Categoría
          </button>
          <button 
            id="btn-add-asset"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-red-100"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto / Bien
          </button>
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex border-b border-zinc-200 gap-1 mt-2">
        <button
          onClick={() => setInventorySubTab('inventory')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all rounded-t-xl",
            inventorySubTab === 'inventory'
              ? "border-red-800 text-red-800 bg-red-50/10 font-extrabold"
              : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
          )}
        >
          <Boxes className="w-4 h-4 text-red-800/80" />
          Stock de Almacén
        </button>
        <button
          onClick={() => setInventorySubTab('summaries')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all rounded-t-xl",
            inventorySubTab === 'summaries'
              ? "border-red-800 text-red-800 bg-red-50/10 font-extrabold"
              : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
          )}
        >
          <History className="w-4 h-4 text-red-800/80" />
          Resúmenes Diarios ({dailySummaries.length})
        </button>
      </div>

      {inventorySubTab === 'inventory' ? (
        <>
          {/* Main Stats Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Cost Inventory Card */}
            <div className="glass-card p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white border-none shadow-xl relative overflow-hidden rounded-3xl">
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="p-2 bg-white/10 rounded-lg w-fit mb-4">
                    <TrendingUp className="w-5 h-5 text-red-400" />
                  </div>
                  <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Costo Total del Inventario</p>
                  <h3 className="text-3xl font-bold mt-1 tracking-tight text-white">{formatCurrency(totalAssetsCost)}</h3>
                </div>
                <p className="text-[10px] text-zinc-400 mt-4 leading-normal">
                  Valor de inversión en costo de {filteredItems.reduce((sum, item) => sum + (item.stock || 0), 0)} unidades físicas de {filteredItems.length} productos.
                </p>
              </div>
              <Boxes className="absolute -right-6 -bottom-6 w-36 h-36 text-white/5 pointer-events-none" />
            </div>

            {/* Sales / profits summary */}
            <div className="glass-card p-6 bg-white border border-zinc-150 flex flex-col justify-between rounded-3xl">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-red-800 uppercase tracking-widest">Resumen de Ventas</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 uppercase">Día Activo</span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-xs text-zinc-650">
                    <span className="font-semibold text-zinc-700">Ingresos Totales por Ventas:</span>
                    <span className="font-extrabold text-zinc-900 text-sm">{formatCurrency(totalSoldIncome)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-600 pt-1 border-t border-zinc-100">
                    <span>Unidades Vendidas:</span>
                    <span className="font-bold text-red-800">{items.reduce((sum, item) => sum + (item.totalSold || 0), 0)} u.</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmSaveSummaryOpen(true)}
                    className="flex-1 py-2 px-3 bg-red-800 hover:bg-red-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1"
                    title="Cierra el día y guarda el historial de hoy"
                  >
                    <History className="w-3.5 h-3.5" />
                    Cerrar Día
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmResetOpen(true)}
                    className="py-2 px-3 border border-zinc-250 hover:bg-zinc-50 text-zinc-650 hover:text-red-800 hover:border-red-850 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all"
                    title="Reiniciar contadores de ventas a 0"
                  >
                    Reiniciar
                  </button>
                </div>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide text-center">
                  Guarda resumen e inicializa a 0
                </p>
              </div>
            </div>

            {/* Low Stock Watch */}
            <div className={cn(
              "glass-card p-6 flex flex-col justify-between transition-all rounded-3xl border",
              lowStockItemsCount > 0 
                ? "bg-red-50/50 border-red-200" 
                : "bg-amber-50/30 border-amber-200"
            )}>
              <div className="flex gap-3">
                <AlertCircle className={cn(
                  "w-5 h-5 shrink-0 mt-0.5",
                  lowStockItemsCount > 0 ? "text-red-700" : "text-amber-700"
                )} />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900">Supervisor de Almacén</h4>
                  <p className="text-xs text-zinc-650 leading-relaxed">
                    {lowStockItemsCount > 0 
                      ? `Atención: Tiene ${lowStockItemsCount} productos con bajo inventario (5 unidades o menos). Considere reabastecerlos para mantener sus ventas continuas.`
                      : "Todos sus productos tienen un stock saludable. Mantenga un ojo en los límites de reabastecimiento para no perder clientes."}
                  </p>
                </div>
              </div>
              <p className={cn(
                "text-[10px] uppercase tracking-wider mt-4 font-extrabold",
                lowStockItemsCount > 0 ? "text-red-700 animate-pulse" : "text-amber-600"
              )}>
                {lowStockItemsCount > 0 ? "⚠️ ¡Requiere Surtido!" : "✅ Niveles estables"}
              </p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="glass-card p-4 flex flex-col md:flex-row justify-between gap-4 items-center bg-white border border-zinc-150 shadow-sm rounded-3xl">
            <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
              <button
                onClick={() => setFilter('All')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  filter === 'All' 
                    ? "bg-red-800 text-white border-red-800"
                    : "bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100"
                )}
              >
                Todos
              </button>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    filter === cat 
                      ? "bg-red-800 text-white border-red-800"
                      : "bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-100"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o categoría..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Dynamic Success Toast Alerts */}
          {successToast && (
            <div className="fixed bottom-5 right-5 z-[100] bg-zinc-950 text-white px-5 py-4 rounded-2xl shadow-2xl border border-zinc-800 flex items-center gap-3 animate-slide-up max-w-sm">
              <div className="p-1.5 bg-emerald-500 rounded-full text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Aviso del Almacén</p>
                <p className="text-xs font-semibold leading-normal text-zinc-100">{successToast}</p>
              </div>
              <button 
                onClick={() => setSuccessToast(null)} 
                className="text-[10px] uppercase font-bold text-zinc-500 hover:text-white transition-colors pl-2 border-l border-zinc-800"
              >
                Ocultar
              </button>
            </div>
          )}

          {/* Asset Grid/List */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-red-800 animate-spin mx-auto mb-3" />
              <span className="text-zinc-500 font-medium">Cargando inventario...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="glass-card p-12 text-center bg-white border border-zinc-100 max-w-md mx-auto rounded-3xl">
              <Boxes className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-zinc-900">Almacén vacío</h3>
              <p className="text-zinc-500 text-xs mt-1 max-w-xs mx-auto">
                No se encontraron productos o mercancía registrada. Haga clic en "Nuevo Producto" para registrar inventario hoy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const IconComponent = categoryIcons[item.category] || Package;
                const colorClass = categoryColors[item.category] || 'bg-zinc-50 text-zinc-650 border-zinc-100';
                const isOnLoan = item.notes?.includes('[EN PRÉSTAMO]');
                
                // Stock indicators
                const stock = item.stock ?? 0;
                const unitCost = item.value ?? 0;
                const retailPrice = item.price || unitCost;
                const marginAmount = retailPrice - unitCost;
                const marginPercent = retailPrice > 0 ? Math.round((marginAmount / retailPrice) * 100) : 0;

                return (
                  <div 
                    key={item.id} 
                    className={cn(
                      "glass-card bg-white border border-zinc-200/90 hover:border-red-500/30 hover:shadow-xl transition-all flex flex-col justify-between group rounded-3xl overflow-hidden",
                      isOnLoan && "border-amber-200 bg-amber-50/10 hover:border-amber-300"
                    )}
                  >
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Header: Category & Detach option */}
                        <div className="flex justify-between items-start">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider w-fit",
                            colorClass
                          )}>
                            <IconComponent className="w-3.5 h-3.5" />
                            {item.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isOnLoan) {
                                alert('Este activo está vinculado a un contrato de préstamo activo. Debe dar de baja o eliminar el préstamo correspondiente para poder liberarlo.');
                                return;
                              }
                              setItemToDelete(item);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors text-zinc-400 hover:text-red-700 hover:bg-red-50"
                            )}
                            title="Eliminar del inventario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Middle Info Block: Title & Stock Status */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-base font-bold text-zinc-950 leading-tight tracking-tight">{item.name}</h4>
                            {isOnLoan && (
                              <span className="shrink-0 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold bg-amber-100 text-amber-800 uppercase tracking-widest border border-amber-200 animate-pulse">
                                Préstamo
                              </span>
                            )}
                          </div>

                          {/* Professional Custom Stock Labels specifically for colmado type services */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {stock === 0 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                                Agotado (0 u.)
                              </span>
                            ) : stock <= 5 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                Bajo Stock ({stock} u.)
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Stock: {stock} u.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Financial Grid: Buy vs Retail metrics */}
                      <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-150 grid grid-cols-2 gap-2 text-xs font-semibold">
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">Costo Compra</p>
                          <p className="text-zinc-800 mt-0.5">{formatCurrency(unitCost)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">Venta Público</p>
                          <p className="text-red-800 mt-0.5 font-bold">{formatCurrency(retailPrice)}</p>
                        </div>
                        {marginAmount > 0 && (
                          <div className="col-span-2 pt-1 border-t border-zinc-200 flex justify-between text-[10px] text-emerald-700 font-bold">
                            <span>Margen estimado:</span>
                            <span>+{formatCurrency(marginAmount)} ({marginPercent}%)</span>
                          </div>
                        )}
                      </div>

                      {/* Performance Log: Sold count & Revenue */}
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider px-1">
                        <span>Vendidos: <strong className="text-zinc-800">{item.totalSold || 0} u.</strong></span>
                        <span>Ingresos: <strong className="text-zinc-800">{formatCurrency(item.salesIncome || 0)}</strong></span>
                      </div>

                      {/* Metadata fields */}
                      <div className="pt-2 border-t border-zinc-100 space-y-1.5 text-xs text-zinc-500 font-medium">
                        <div className="flex items-center gap-2 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>Adquirido: {new Date(item.purchaseDate).toLocaleDateString()}</span>
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 text-red-700" />
                            <span className="truncate" title={item.location}>{item.location}</span>
                          </div>
                        )}
                        {item.notes && (
                          <div className="flex items-start gap-2 pt-1">
                            <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                            <span className={cn(
                              "font-normal leading-relaxed text-[11px] p-2 rounded-xl w-full",
                              isOnLoan ? "bg-amber-100/30 text-amber-900 border border-amber-100/60" : "bg-zinc-50 text-zinc-650"
                            )}>
                              {item.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* POS Business Operations control deck for Colmado style environments */}
                    <div className="border-t border-zinc-150 bg-zinc-50/70 p-4 grid grid-cols-2 gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSellingItem(item);
                          setSaleQty(1);
                          setSalePriceOverride(item.price || item.value);
                          setSaleError(null);
                        }}
                        disabled={stock <= 0}
                        className={cn(
                          "flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border shadow-sm",
                          stock > 0
                            ? "bg-red-800 text-white border-red-800 hover:bg-red-900"
                            : "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                        )}
                        title={stock <= 0 ? "Falta de stock para vender" : "Registrar una venta"}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Vender
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRestockingItem(item);
                          setRestockQty(10);
                          setRestockCostOverride(item.value);
                          setRestockError(null);
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm"
                        title="Añadir stock / reabastecer"
                      >
                        <Plus className="w-3.5 h-3.5 text-zinc-500" />
                        Surtir +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div id="daily-summaries-module" className="space-y-6 animate-fade-in">
          {/* Historical stats strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 bg-white border border-zinc-150 flex flex-col justify-between rounded-3xl">
              <div>
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Jornadas Históricas</p>
                <h3 className="text-3xl font-black mt-1 text-zinc-900 tracking-tight">{dailySummaries.length} fechas</h3>
              </div>
              <p className="text-[10px] text-zinc-400 mt-4 leading-normal font-bold uppercase tracking-wider">
                Total de resúmenes diarios cerrados
              </p>
            </div>

            <div className="glass-card p-6 bg-gradient-to-br from-red-950 to-red-900 text-white border-none shadow-xl relative overflow-hidden rounded-3xl">
              <div className="relative z-10">
                <p className="text-red-200 text-xs font-semibold uppercase tracking-wider">Ventas Históricas Acumuladas</p>
                <h3 className="text-3xl font-bold mt-1 tracking-tight text-white">{formatCurrency(dailySummaries.reduce((sum, s) => sum + s.totalIncome, 0))}</h3>
              </div>
              <History className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 pointer-events-none" />
              <p className="text-[10px] text-red-300 mt-4 relative z-10 leading-normal font-bold uppercase tracking-wider">
                Ingresos brutos guardados históricamente
              </p>
            </div>

            <div className="glass-card p-6 bg-emerald-50 text-emerald-950 border border-emerald-250/80 rounded-3xl">
              <div>
                <p className="text-emerald-700/80 text-xs font-semibold uppercase tracking-wider">Ganancias Totales Acumuladas</p>
                <h3 className="text-3xl font-black mt-1 text-emerald-900 tracking-tight">{formatCurrency(dailySummaries.reduce((sum, s) => sum + s.totalProfit, 0))}</h3>
              </div>
              <p className="text-[10px] text-emerald-600 mt-4 leading-normal font-bold uppercase tracking-wider">
                Beneficios netos estimados de jornadas cerradas
              </p>
            </div>
          </div>

          {/* List of Summaries */}
          {dailySummaries.length === 0 ? (
            <div className="glass-card p-12 text-center bg-white border border-zinc-100 max-w-md mx-auto rounded-3xl mt-8">
              <History className="w-12 h-12 text-zinc-300 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-zinc-900">Historial vacío</h3>
              <p className="text-zinc-500 text-xs mt-1 max-w-xs mx-auto">
                No se han guardado resúmenes de venta diarios. Cuando termine su jornada, haga clic en "Cerrar Día" en el panel de control del almacén para guardar el resumen de ventas del día actual con su historial detallado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                  <History className="w-4 h-4 text-red-800" />
                  Historial de Cierres de Ventas
                </h3>
                <span className="text-xs font-medium text-zinc-500">{dailySummaries.length} registros</span>
              </div>

              <div className="space-y-3">
                {dailySummaries.map((summary) => {
                  const isExpanded = expandedSummaryId === summary.id;
                  
                  // Human-readable date formatting
                  let formattedDateStr = summary.date;
                  try {
                    const dateParts = summary.date.split('-');
                    const dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
                    formattedDateStr = dateObj.toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    });
                    // Capitalize first letter
                    formattedDateStr = formattedDateStr.charAt(0).toUpperCase() + formattedDateStr.slice(1);
                  } catch (e) {
                    console.error("Error formatting date of summary:", e);
                  }

                  return (
                    <div 
                      key={summary.id}
                      className="glass-card bg-white border border-zinc-200/95 rounded-2xl overflow-hidden transition-all hover:border-zinc-300 shadow-sm"
                    >
                      {/* Summary Header Frame */}
                      <div 
                        onClick={() => setExpandedSummaryId(isExpanded ? null : summary.id)}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-zinc-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-red-50 text-red-800 rounded-xl">
                            <Calendar className="w-5 h-5 text-red-700" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-zinc-900 leading-tight">{formattedDateStr}</h4>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide mt-0.5">
                              Guardado el: {new Date(summary.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} • {summary.productsSold.length} productos diferentes vendidos
                            </p>
                          </div>
                        </div>

                        {/* Summary Metrics block */}
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-6 text-xs font-semibold">
                            <div className="text-right">
                              <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Unidades Vendidas</p>
                              <p className="text-zinc-800 font-bold mt-0.5">{summary.totalUnitsSold} u.</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Ventas Totales</p>
                              <p className="text-red-900 font-black mt-0.5 text-sm">{formatCurrency(summary.totalIncome)}</p>
                            </div>
                            <div className="text-right bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-150">
                              <p className="text-[8px] text-emerald-700/90 uppercase font-black tracking-widest">Ganancia Neta</p>
                              <p className="text-emerald-800 font-bold mt-0.5">{formatCurrency(summary.totalProfit)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 border-l border-zinc-200 pl-4 py-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSummary(summary.id);
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1 text-zinc-500 hover:text-zinc-800"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Summary Expanded List Table */}
                      {isExpanded && (
                        <div className="border-t border-zinc-150 bg-zinc-50/50 p-5 animate-fade-in overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="border-b border-zinc-200 text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">
                                <th className="pb-2.5">Producto Vendido</th>
                                <th className="pb-2.5">Categoría</th>
                                <th className="pb-2.5 text-right">Costo Compra</th>
                                <th className="pb-2.5 text-right">Venta Público</th>
                                <th className="pb-2.5 text-right">Margen Unidad</th>
                                <th className="pb-2.5 text-right">Cant. Vendida</th>
                                <th className="pb-2.5 text-right">Ingreso Bruto</th>
                                <th className="pb-2.5 text-right text-emerald-800">Ganancia Neta</th>
                              </tr>
                            </thead>
                            <tbody className="text-xs font-semibold text-zinc-700 divide-y divide-zinc-150">
                              {summary.productsSold.map((prod, index) => {
                                const unitProfit = prod.sellPrice - prod.purchaseCost;
                                return (
                                  <tr key={index} className="hover:bg-zinc-100/40">
                                    <td className="py-3 font-bold text-zinc-900">{prod.name}</td>
                                    <td className="py-3">
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-zinc-100 text-zinc-650 tracking-wider uppercase border border-zinc-200/60">
                                        {prod.category}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right text-zinc-500 font-mono">{formatCurrency(prod.purchaseCost)}</td>
                                    <td className="py-3 text-right text-zinc-900 font-bold font-mono">{formatCurrency(prod.sellPrice)}</td>
                                    <td className={`py-3 text-right font-bold font-mono ${unitProfit > 0 ? "text-emerald-700" : "text-zinc-500"}`}>
                                      {unitProfit > 0 ? `+${formatCurrency(unitProfit)}` : formatCurrency(unitProfit)}
                                    </td>
                                    <td className="py-3 text-right font-extrabold text-zinc-900">{prod.quantity} u.</td>
                                    <td className="py-3 text-right text-zinc-950 font-black font-mono">{formatCurrency(prod.income)}</td>
                                    <td className="py-3 text-right text-emerald-800 font-black font-mono bg-emerald-50/30 px-1">{formatCurrency(prod.profit)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="font-extrabold text-sm text-zinc-900 border-t-2 border-zinc-300">
                                <td colSpan={5} className="pt-3 font-bold text-xs uppercase tracking-wider text-zinc-400">Totales del Cierre:</td>
                                <td className="pt-3 text-right font-black text-red-900">{summary.totalUnitsSold} u.</td>
                                <td className="pt-3 text-right font-black text-red-950">{formatCurrency(summary.totalIncome)}</td>
                                <td className="pt-3 text-right font-black text-emerald-800 bg-emerald-50/40 px-1">{formatCurrency(summary.totalProfit)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm shadow-2xl">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] border border-zinc-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">Registrar en Almacén / Inventario</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nombre del Bien / Producto *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Saco de Arroz Selecto 50lb / Agua Crystal"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none transition-all"
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Categoría *</label>
                    <button 
                      type="button" 
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[9px] text-red-850 hover:underline font-black uppercase tracking-wider"
                    >
                      + Crear Nueva
                    </button>
                  </div>
                  <select
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Costo Unitario ($) *</label>
                  <input 
                    type="number" 
                    required
                    placeholder="Ej: Costo de compra 15.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                    value={newItem.value || ''}
                    onChange={e => setNewItem({...newItem, value: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-b border-zinc-150 py-3 mt-1 bg-zinc-50 p-3 rounded-2xl">
                <div>
                  <label className="block text-[10px] font-extrabold text-red-800 uppercase tracking-wider mb-1">Precio Venta Público</label>
                  <input 
                    type="number" 
                    placeholder="Ej: Venta al cliente 25.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs focus:ring-1 focus:ring-red-850 outline-none"
                    value={newItem.price || ''}
                    onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-red-800 uppercase tracking-wider mb-1">Stock Disponible Inicial</label>
                  <input 
                    type="number" 
                    placeholder="Ej: 50 unidades"
                    min="0"
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs focus:ring-1 focus:ring-red-850 outline-none"
                    value={newItem.stock || ''}
                    onChange={e => setNewItem({...newItem, stock: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Fecha de Adquisición *</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newItem.purchaseDate}
                  onChange={e => setNewItem({...newItem, purchaseDate: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Ubicación / Dirección Almacén (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Estantería B3 / Pasillo Central"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newItem.location}
                  onChange={e => setNewItem({...newItem, location: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Notas / Detalles Adicionales</label>
                <textarea 
                  placeholder="Ej: Distribuidor de refrescos, lote de vencimiento..."
                  rows={2}
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newItem.notes}
                  onChange={e => setNewItem({...newItem, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-red-800 hover:bg-red-900 text-white rounded-2xl font-black transition-all shadow-lg hover:shadow-xl hover:shadow-red-200 mt-4"
              >
                Guardar Ítem en Almacén
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm shadow-2xl animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-150 animate-slide-up">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-red-50 text-red-700 rounded-full animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-zinc-950 uppercase tracking-tight">¿Eliminar Producto?</h4>
              <p className="text-xs text-zinc-500 leading-normal">
                ¿Está seguro de que desea eliminar <strong>"{itemToDelete.name}"</strong>? Esta acción es permanente y registrará la baja total de su stock actual.
              </p>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAsset}
                className="flex-1 py-3 bg-red-800 text-white font-heavy text-xs rounded-xl hover:bg-red-900 transition-colors flex items-center justify-center gap-1.5"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Borrando...
                  </>
                ) : (
                  "Sí, Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Quick Venta Modal */}
      {sellingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm shadow-2xl animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-zinc-150 animate-slide-up bg-gradient-to-b from-white to-zinc-50">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-red-800" />
                <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider">Registrar Venta (POS)</h3>
              </div>
              <button 
                onClick={() => setSellingItem(null)} 
                className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleProcessSale} className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400">Producto a vender</p>
                <p className="text-sm font-black text-zinc-900 mt-0.5">{sellingItem.name}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-600 font-semibold">
                  <span>Stock disponible:</span>
                  <span className="text-red-800 font-black">{sellingItem.stock ?? 0} unidades</span>
                </div>
              </div>

              {saleError && (
                <div className="bg-red-50 text-red-700 text-xs font-semibold p-3 rounded-xl border border-red-150">
                  {saleError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-zinc-400 uppercase tracking-wider mb-1.5">Cantidad a vender *</label>
                  <div className="flex items-center justify-between bg-zinc-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setSaleQty(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1.5 bg-white text-zinc-800 hover:bg-zinc-50 rounded-lg text-xs font-black transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      required
                      min="1"
                      max={sellingItem.stock ?? 1}
                      className="w-full bg-transparent border-none text-center outline-none text-xs font-extrabold"
                      value={saleQty}
                      onChange={e => setSaleQty(Math.min(sellingItem.stock ?? 1, Math.max(1, Number(e.target.value))))}
                    />
                    <button
                      type="button"
                      onClick={() => setSaleQty(prev => Math.min(sellingItem.stock ?? 1, prev + 1))}
                      className="px-2.5 py-1.5 bg-white text-zinc-800 hover:bg-zinc-50 rounded-lg text-xs font-black transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5">Precio Unitario ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-zinc-100 border-none rounded-xl text-xs font-extrabold focus:ring-1 focus:ring-red-800 outline-none"
                    value={salePriceOverride || ''}
                    onChange={e => setSalePriceOverride(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-emerald-800">Total Ingresos Generados:</span>
                  <span className="text-base font-black text-emerald-950">
                    {formatCurrency(Number(saleQty || 0) * Number(salePriceOverride || 0))}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700/80 leading-normal font-medium pl-1 border-l-2 border-emerald-500">
                  Esta venta deducirá exactamente {saleQty} unidades del almacén y guardará automáticamente un ingreso de {formatCurrency(Number(saleQty || 0) * Number(salePriceOverride || 0))} en su contabilidad.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSellingItem(null)}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors"
                  disabled={saleProcessing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-800 text-white font-black text-xs rounded-xl hover:bg-red-900 transition-colors flex items-center justify-center gap-1"
                  disabled={saleProcessing}
                >
                  {saleProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Confirmar y Vender"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Surtir Inventario Modal */}
      {restockingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm shadow-2xl animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-zinc-150 animate-slide-up bg-gradient-to-b from-white to-zinc-50">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-red-800" />
                <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider">Surtir Almacén / Mercancía</h3>
              </div>
              <button 
                onClick={() => setRestockingItem(null)} 
                className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleProcessRestock} className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400">Producto a surtir</p>
                <p className="text-sm font-black text-zinc-950 mt-0.5">{restockingItem.name}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-600 font-semibold">
                  <span>Stock actual anterior:</span>
                  <span className="text-red-850 font-black">{restockingItem.stock ?? 0} unidades</span>
                </div>
              </div>

              {restockError && (
                <div className="bg-red-50 text-red-700 text-xs font-semibold p-3 rounded-xl border border-red-150">
                  {restockError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5">Cantidad a agregar *</label>
                  <div className="flex items-center justify-between bg-zinc-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setRestockQty(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1.5 bg-white text-zinc-800 hover:bg-zinc-50 rounded-lg text-xs font-black transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-transparent border-none text-center outline-none text-xs font-extrabold"
                      value={restockQty}
                      onChange={e => setRestockQty(Math.max(1, Number(e.target.value)))}
                    />
                    <button
                      type="button"
                      onClick={() => setRestockQty(prev => prev + 1)}
                      className="px-2.5 py-1.5 bg-white text-zinc-850 hover:bg-zinc-50 rounded-lg text-xs font-black transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5">Costo Unitario ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-zinc-100 border-none rounded-xl text-xs font-extrabold focus:ring-1 focus:ring-red-800 outline-none"
                    value={restockCostOverride || ''}
                    onChange={e => setRestockCostOverride(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-indigo-800">Inversión Gasto de Adopción:</span>
                  <span className="text-base font-black text-indigo-950">
                    {formatCurrency(Number(restockQty || 0) * Number(restockCostOverride || 0))}
                  </span>
                </div>
                <p className="text-[10px] text-indigo-700/80 leading-normal font-medium pl-1 border-l-2 border-indigo-500">
                  Esta acción añadirá exactamente +{restockQty} unidades físicas al stock de "{restockingItem.name}" y registrará un egreso de {formatCurrency(Number(restockQty || 0) * Number(restockCostOverride || 0))} en Financiera Nova.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockingItem(null)}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors"
                  disabled={restockProcessing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-800 text-white font-black text-xs rounded-xl hover:bg-red-900 transition-colors flex items-center justify-center gap-1"
                  disabled={restockProcessing}
                >
                  {restockProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Surtido"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nueva Categoría Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm shadow-2xl animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-150 animate-slide-up">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
              <h4 className="text-base font-black text-zinc-950 uppercase tracking-tight">Nueva Categoría</h4>
              <button 
                onClick={() => { setIsCategoryModalOpen(false); setNewCategoryName(''); setCategoryModalError(null); }} 
                className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nombre de Categoría *</label>
                <input 
                  type="text" 
                  placeholder="Ej: Embutidos / Enlatados"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newCategoryName}
                  onChange={e => { setNewCategoryName(e.target.value); setCategoryModalError(null); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCategory();
                    }
                  }}
                />
                {categoryModalError && (
                  <p className="text-xs text-red-650 font-bold mt-1.5">{categoryModalError}</p>
                )}
              </div>
              
              <div className="flex gap-2.5 pt-2">
                <button 
                  type="button"
                  onClick={() => { setIsCategoryModalOpen(false); setNewCategoryName(''); setCategoryModalError(null); }}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleSaveCategory}
                  className="flex-1 py-1 px-3 bg-red-800 text-white font-heavy text-xs rounded-xl hover:bg-red-900 transition-colors"
                >
                  Crear Categoría
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Modal Confirmación de Reinicio de Contadores */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm shadow-2xl animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-150 animate-slide-up">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-150 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-700 animate-bounce" />
                <h4 className="text-sm font-black text-zinc-950 uppercase tracking-tight">Reiniciar Contadores</h4>
              </div>
              <button 
                onClick={() => setIsConfirmResetOpen(false)} 
                className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-zinc-650 text-xs leading-relaxed">
                Esta acción restablecerá las métricas de todos sus productos a cero (0 unidades vendidas, RD$0 ingresos) para comenzar un nuevo día de ventas.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-150 rounded-2xl p-4 text-[11px] text-yellow-850 font-semibold space-y-1">
                <p>⚠️ Importante:</p>
                <p className="font-medium text-yellow-700/95 leading-normal">
                  Los productos y el stock restante físico de su almacén **NO** serán alterados. Solo se reiniciarán los contadores diarios de venta.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsConfirmResetOpen(false)}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-750 hover:bg-zinc-200 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleResetSalesCounters(false)}
                  disabled={isResettingCounters}
                  className="flex-1 py-3 bg-red-800 hover:bg-red-900 text-white font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {isResettingCounters ? (
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    "Sí, Reiniciar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Confirmación de Cierre del Día (Cerrar Día y Guardar Resumen) */}
      {isConfirmSaveSummaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm shadow-2xl animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-zinc-150 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-150 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-red-800" />
                <h4 className="text-sm font-black text-zinc-950 uppercase tracking-tight">Cerrar Jornada Diaria</h4>
              </div>
              <button 
                onClick={() => setIsConfirmSaveSummaryOpen(false)} 
                className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-zinc-650 text-xs leading-relaxed">
                Está a punto de archivar las ventas de hoy en su historial de resúmenes diarios. Revise la información para cerrar su jornada:
              </p>

              {/* Date selection for close */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Fecha de Cierre (YYYY-MM-DD) *</label>
                <input 
                  type="date"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-100 border-none rounded-2xl text-xs font-bold font-mono text-zinc-800 outline-none focus:ring-1 focus:ring-red-800"
                  value={selectedSummaryDate}
                  onChange={e => setSelectedSummaryDate(e.target.value)}
                />
              </div>

              {/* Actives sold preview */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 border-b border-zinc-150 px-4 py-2 flex justify-between text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide">
                  <span>Bien / Producto</span>
                  <span>Unidades vendidas hoy</span>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-zinc-100">
                  {items.filter(item => (item.totalSold || 0) > 0).map((item) => {
                    const qty = item.totalSold || 0;
                    const income = item.salesIncome || (qty * (item.price || item.value));
                    return (
                      <div key={item.id} className="px-4 py-2.5 flex justify-between items-center text-xs font-semibold text-zinc-800">
                        <span className="truncate pr-4">{item.name}</span>
                        <div className="shrink-0 text-right">
                          <span className="font-extrabold text-zinc-900">{qty} u.</span>
                          <span className="text-zinc-400 mx-1.5">•</span>
                          <span className="text-red-900 font-bold">{formatCurrency(income)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {items.filter(item => (item.totalSold || 0) > 0).length === 0 && (
                    <p className="p-4 text-center text-xs text-zinc-400 italic">No hay ninguna venta registrada para resumir hoy.</p>
                  )}
                </div>
              </div>

              {/* Totals Preview Grid */}
              <div className="grid grid-cols-3 gap-3 bg-red-50/40 border border-red-100 p-4 rounded-2xl text-center">
                <div>
                  <p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Unidades</p>
                  <p className="text-sm font-extrabold text-zinc-800 mt-0.5">
                    {items.reduce((sum, item) => sum + (item.totalSold || 0), 0)} u.
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Ingreso Total</p>
                  <p className="text-sm font-black text-red-950 mt-0.5">
                    {formatCurrency(items.reduce((sum, item) => sum + (item.salesIncome || 0), 0))}
                  </p>
                </div>
                <div className="bg-emerald-50 px-2 py-1.5 rounded-xl border border-emerald-150">
                  <p className="text-[8px] text-emerald-800 uppercase font-black tracking-widest leading-none">Ganancia Est.</p>
                  <p className="text-xs font-extrabold text-emerald-800 mt-0.5">
                    {formatCurrency(
                      items.reduce((sum, item) => {
                        const qty = item.totalSold || 0;
                        const buyCost = item.value || 0;
                        const sellPrice = item.price || buyCost;
                        const income = item.salesIncome || (qty * sellPrice);
                        const profit = income - (qty * buyCost);
                        return sum + (profit > 0 ? profit : 0);
                      }, 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Auto reset option */}
              <div className="flex items-start gap-2.5 p-3 bg-zinc-50 border border-zinc-150 rounded-2xl">
                <input 
                  id="auto-reset-checkbox"
                  type="checkbox"
                  defaultChecked={true}
                  className="mt-0.5 rounded border-zinc-300 text-red-800 focus:ring-red-800 hover:border-red-800 cursor-pointer"
                />
                <label htmlFor="auto-reset-checkbox" className="text-[11px] text-zinc-650 font-bold select-none cursor-pointer leading-normal">
                  Reiniciar automáticamente todos los contadores de productos vendidos e ingresos a cero (0) tras guardar exitosamente.
                </label>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-zinc-100 font-bold uppercase text-xs tracking-wide">
                <button 
                  type="button"
                  onClick={() => setIsConfirmSaveSummaryOpen(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const chk = document.getElementById('auto-reset-checkbox') as HTMLInputElement | null;
                    const autoReset = chk ? chk.checked : true;
                    handleSaveDailySummary(autoReset);
                  }}
                  disabled={isSavingSummary}
                  className="flex-1 py-3 bg-red-800 hover:bg-red-900 text-white font-black rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSavingSummary ? (
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    "Guardar y Cerrar Día"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
