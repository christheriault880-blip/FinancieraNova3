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
  AlertCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { subscribeToInventory, addInventoryItem, deleteInventoryItem } from '../services/firestoreService';
import { InventoryItem, InventoryCategory } from '../types';

const categoryIcons: Record<InventoryCategory, any> = {
  'Inmuebles': Building,
  'Vehículos': Car,
  'Tecnología': Smartphone,
  'Equipamiento': Wrench,
  'Otros': Package,
};

const categoryColors: Record<InventoryCategory, string> = {
  'Inmuebles': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Vehículos': 'bg-blue-50 text-blue-600 border-blue-100',
  'Tecnología': 'bg-purple-50 text-purple-600 border-purple-100',
  'Equipamiento': 'bg-amber-50 text-amber-600 border-amber-100',
  'Otros': 'bg-zinc-50 text-zinc-600 border-zinc-100',
};

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InventoryCategory | 'All'>('All');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Otros' as InventoryCategory,
    value: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToInventory(user.uid, (data) => {
      setItems(data);
      setLoading(false);
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
        purchaseDate: new Date(newItem.purchaseDate + 'T12:00:00Z').toISOString(),
        location: newItem.location || undefined,
        notes: newItem.notes || undefined,
        uid: user.uid
      });
      
      // Reset form and close modal
      setNewItem({
        name: '',
        category: 'Otros',
        value: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        location: '',
        notes: ''
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al agregar activo:', err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!user) return;
    try {
      await deleteInventoryItem(user.uid, id);
    } catch (err) {
      console.error('Error al eliminar activo de inventario:', err);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'All' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.category.toLowerCase().includes(search.toLowerCase()) ||
                          (item.location && item.location.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const totalAssetsValue = filteredItems.reduce((acc, curr) => acc + curr.value, 0);

  // Group status distribution
  const countByCategory = (cat: InventoryCategory) => {
    return items.filter(item => item.category === cat).length;
  };

  return (
    <div id="inventory-container" className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Inventario y Activos</h2>
          <p className="text-zinc-500">Registra y valora tus propiedades, vehículos, objetos de valor y equipamiento.</p>
        </div>
        <button 
          id="btn-add-asset"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-red-100 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Nuevo Activo
        </button>
      </div>

      {/* Main Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Assets Card */}
        <div className="glass-card p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white border-none shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="p-2 bg-white/10 rounded-lg w-fit mb-4">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-zinc-400 text-sm font-medium">Valor Total de Activos</p>
              <h3 className="text-3xl font-bold mt-1 tracking-tight text-white">{formatCurrency(totalAssetsValue)}</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              Valor de {filteredItems.length} activos en la selección actual.
            </p>
          </div>
          <Boxes className="absolute -right-6 -bottom-6 w-36 h-36 text-white/5 pointer-events-none" />
        </div>

        {/* Quick Insights Card */}
        <div className="glass-card p-6 bg-white border border-zinc-100 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-red-800 uppercase tracking-widest block mb-2">Resumen de Categorías</span>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-xs text-zinc-600">
                <span className="font-medium">🏠 Inmuebles:</span>
                <span className="font-bold text-zinc-900">{countByCategory('Inmuebles')} ítems</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-600">
                <span className="font-medium">🚗 Vehículos:</span>
                <span className="font-bold text-zinc-900">{countByCategory('Vehículos')} ítems</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-600">
                <span className="font-medium">💻 Tecnología:</span>
                <span className="font-bold text-zinc-900">{countByCategory('Tecnología')} ítems</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 font-semibold uppercase mt-4 tracking-widest border-t border-zinc-100 pt-2">
            Distribución de Patrimonio
          </p>
        </div>

        {/* Info Box Card */}
        <div className="glass-card p-6 bg-amber-50/50 border border-amber-200/60 flex flex-col justify-between">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900">Control de Patrimonio</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Tener un registro de inventario te permite evaluar tu patrimonio neto real (Activos - Deudas) e incluir tus inmuebles u objetos como respaldo financiero.
              </p>
            </div>
          </div>
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-2">
            ⚠️ Valor de mercado estimado
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row justify-between gap-4 items-center bg-white border border-zinc-100 shadow-sm">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setFilter('All')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              filter === 'All' 
                ? "bg-red-800 text-white border-red-800"
                : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
            )}
          >
            Todos
          </button>
          {Object.keys(categoryIcons).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as InventoryCategory)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                filter === cat 
                  ? "bg-red-800 text-white border-red-800"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
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
            placeholder="Buscar activo..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* Asset Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <span className="text-zinc-500 font-medium">Cargando inventario...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card p-12 text-center bg-white border border-zinc-100 max-w-md mx-auto">
          <Boxes className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-900">Inventario vacío</h3>
          <p className="text-zinc-500 text-xs mt-1 max-w-xs mx-auto">
            Registra tu primer activo (como tu vivienda, tu vehículo, equipos electrónicos u otros) para comenzar el seguimiento corporativo o personal de tus bienes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const IconComponent = categoryIcons[item.category] || Package;
            const colorClass = categoryColors[item.category] || 'bg-zinc-50 text-zinc-600 border-zinc-100';
            const isOnLoan = item.notes?.includes('[EN PRÉSTAMO]');
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "glass-card bg-white border border-zinc-200/80 hover:border-red-200 hover:shadow-lg transition-all flex flex-col justify-between group rounded-3xl overflow-hidden",
                  isOnLoan && "border-amber-200 bg-amber-50/10 hover:border-amber-300"
                )}
              >
                <div className="p-6 space-y-4">
                  {/* Category & Action bar */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider w-fit",
                        colorClass
                      )}>
                        <IconComponent className="w-3.5 h-3.5" />
                        {item.category}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (isOnLoan) {
                          alert('Este activo está vinculado a un contrato de préstamo activo. Debe dar de baja o eliminar el préstamo correspondiente para poder liberar y borrar este activo.');
                          return;
                        }
                        handleDeleteAsset(item.id);
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100",
                        isOnLoan 
                          ? "text-zinc-300 cursor-not-allowed hover:bg-zinc-100 hover:text-zinc-400" 
                          : "text-zinc-400 hover:text-red-700 hover:bg-red-50"
                      )}
                      title={isOnLoan ? "Activo Bloqueado: Cedido en Préstamo" : "Eliminar activo"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Item info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-zinc-900 leading-tight tracking-tight">{item.name}</h4>
                      {isOnLoan && (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[8.5px] font-extrabold bg-amber-100 text-amber-800 uppercase tracking-widest border border-amber-200 animate-pulse">
                          En Préstamo
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-black text-red-800 tracking-tight">{formatCurrency(item.value)}</p>
                  </div>

                  {/* Metadata fields */}
                  <div className="pt-2 border-t border-zinc-100 space-y-2 text-xs text-zinc-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Adquirido: {new Date(item.purchaseDate).toLocaleDateString()}</span>
                    </div>
                    {item.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate" title={item.location}>{item.location}</span>
                      </div>
                    )}
                    {item.notes && (
                      <div className="flex items-start gap-2 pt-1">
                        <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span className={cn(
                          "font-normal leading-relaxed text-[11px] p-2 rounded-xl w-full",
                          isOnLoan ? "bg-amber-100/30 text-amber-900 border border-amber-100/60" : "bg-zinc-50 text-zinc-600"
                        )}>
                          {item.notes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zinc-900">Registrar Nuevo Activo</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nombre / Descripción del Bien</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Jeepeta Wrangler Hermética"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Categoría</label>
                  <select
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none appearance-none"
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value as InventoryCategory})}
                  >
                    {Object.keys(categoryIcons).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Valor Estimado ($)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="0.00"
                    min="1"
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                    value={newItem.value || ''}
                    onChange={e => setNewItem({...newItem, value: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Fecha de Adquisición</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newItem.purchaseDate}
                  onChange={e => setNewItem({...newItem, purchaseDate: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Ubicación / Dirección (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Ensanche Naco, Santo Domingo"
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newItem.location}
                  onChange={e => setNewItem({...newItem, location: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Notas / Detalles (Opcional)</label>
                <textarea 
                  placeholder="Matrícula, estado del bien, número de serie, marcas..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 outline-none"
                  value={newItem.notes}
                  onChange={e => setNewItem({...newItem, notes: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-red-800 hover:bg-red-900 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-100 mt-4"
              >
                Guardar Activo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
