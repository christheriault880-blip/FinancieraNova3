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
  FolderOpen,
  Boxes,
  AlertCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { 
  subscribeToInventory, 
  updateInventoryItem, 
  addTransaction 
} from '../services/firestoreService';
import { InventoryItem } from '../types';
import PosCalculator from './PosCalculator';

interface InvoiceItem {
  id: string;
  productId?: string;
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
  const { user, profile } = useAuth();
  
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

  // Real-time Inventory list
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isAddingProductMode, setIsAddingProductMode] = useState<boolean>(true);

  // Invoice Items (starts empty for real POS/billing usage)
  const [items, setItems] = useState<InvoiceItem[]>([]);

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

  // Navigation tabs for billing sub-modes
  const [billingSubTab, setBillingSubTab] = useState<'pos_calculator' | 'classic_billing'>('pos_calculator');

  // POS / Calculator Mode state variables
  const [posSearchSearch, setPosSearchSearch] = useState('');
  const [posCart, setPosCart] = useState<{ id: string; productId: string; name: string; price: number; quantity: number; maxStock: number }[]>([]);
  const [posClientName, setPosClientName] = useState('Cliente General POS');
  const [posClientRnc, setPosClientRnc] = useState('');
  const [posTaxRate, setPosTaxRate] = useState(18); // default ITBIS 18%
  const [posDiscount, setPosDiscount] = useState(0); 
  const [posSuccessModal, setPosSuccessModal] = useState<{
    invoiceNumber: string;
    clientName: string;
    totalItems: number;
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
    itemsSummary: { productId: string; name: string; price: number; quantity: number }[];
  } | null>(null);
  const [isProcessingPos, setIsProcessingPos] = useState(false);
  const [productQuantitiesInput, setProductQuantitiesInput] = useState<Record<string, number>>({});

  // Save changes to localStorage on change
  useEffect(() => {
    localStorage.setItem('nova_saved_invoices', JSON.stringify(savedInvoices));
  }, [savedInvoices]);

  // Load real-time items from user inventory
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, (data) => {
      setInventoryItems(data);
    });
    return () => unsubscribe();
  }, [user]);

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
    setItems([]);
    setSelectedProductId('');
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  // Handler to save current invoice draft in history
  const handleSaveInvoice = async () => {
    if (!user) {
      alert('Debe iniciar sesión para guardar facturas.');
      return;
    }
    if (!clientName) {
      alert('Por favor ingrese el nombre del cliente antes de guardar la factura.');
      return;
    }
    if (items.length === 0) {
      alert('Por favor agregue por lo menos un producto o concepto a la factura.');
      return;
    }

    // Dynamic stock limit check before database commitment
    const stockErrors: string[] = [];
    for (const item of items) {
      if (item.productId) {
        const found = inventoryItems.find(it => it.id === item.productId);
        if (found) {
          const currentStock = found.stock || 0;
          if (item.quantity > currentStock) {
            stockErrors.push(`El producto "${found.name}" excede el stock disponible. Stock: ${currentStock} u., en factura: ${item.quantity} u.`);
          }
        }
      }
    }

    if (stockErrors.length > 0) {
      alert(`⚠️ Problema de Inventario:\n\n${stockErrors.join('\n')}\n\nPor favor disminuya la cantidad solicitada para proceder.`);
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
    let isCreatingNew = true;
    
    if (existsIndex >= 0) {
      const confirmOverwrite = window.confirm(`La factura con código ${invoiceNumber} ya existe en el historial. ¿Desea sobrescribirla / actualizarla con los datos actuales?`);
      if (confirmOverwrite) {
        updated = [...savedInvoices];
        updated[existsIndex] = currentInvoice;
        isCreatingNew = false;
      } else {
        return;
      }
    } else {
      updated = [currentInvoice, ...savedInvoices];
    }

    try {
      // Deduct stock levels in Firestore database automatically
      for (const item of items) {
        if (item.productId) {
          const found = inventoryItems.find(it => it.id === item.productId);
          if (found) {
            const currentStock = found.stock || 0;
            const updatedStock = Math.max(0, currentStock - item.quantity);
            const updatedSold = (found.totalSold || 0) + item.quantity;
            const updatedIncome = (found.salesIncome || 0) + (item.quantity * item.price);

            await updateInventoryItem(user.uid, item.productId, {
              stock: updatedStock,
              totalSold: updatedSold,
              salesIncome: updatedIncome
            });
          }
        }
      }

      // Log automatically of income transaction in finance ledger if status is paid
      if (status === 'paid' && isCreatingNew) {
        await addTransaction(user.uid, {
          amount: grandTotal,
          category: 'Otros',
          description: `Venta Facturada: ${invoiceNumber} para ${clientName}`,
          date: new Date().toISOString(),
          type: 'income'
        });
      }

      setSavedInvoices(updated);
      alert(`✅ Factura ${invoiceNumber} guardada exitosamente.\nSe ha descontado la cantidad vendida del inventario de forma automática.`);
    } catch (dbErr) {
      console.error("Error al descontar stock de inventario:", dbErr);
      alert("Factura guardada, pero ocurrió un error al actualizar los niveles físicos de stock en Firestore.");
      setSavedInvoices(updated);
    }
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

  // POS calculations (declared early to be usable in save helpers)
  const posSubtotal = posCart.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
  const posTaxAmount = (posSubtotal * posTaxRate) / 100;
  const posGrandTotal = Math.max(0, posSubtotal + posTaxAmount - posDiscount);

  // POS/Calculator Cart handlers and inventory checkout method
  const handleAddProductToPosCart = (prod: InventoryItem) => {
    const qty = productQuantitiesInput[prod.id] || 1;
    const stockAvailable = prod.stock || 0;
    
    if (qty <= 0) {
      alert("Por favor ajuste una cantidad válida de al menos 1 unidad.");
      return;
    }
    
    if (qty > stockAvailable) {
      alert(`⚠️ No puede vender más cantidad de la disponible en inventario (${stockAvailable} u.).`);
      return;
    }

    // Check what is already in the cart for this product
    const existing = posCart.find(item => item.productId === prod.id);
    const existingQty = existing ? existing.quantity : 0;

    if (existingQty + qty > stockAvailable) {
      alert(`⚠️ Límite Excedido: Ya tiene ${existingQty} unidades en el carrito y está intentando agregar ${qty} más, lo cual supera el stock disponible de ${stockAvailable} unidades.`);
      return;
    }

    if (existing) {
      setPosCart(posCart.map(item => 
        item.productId === prod.id 
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setPosCart([
        ...posCart,
        {
          id: 'pos-' + Date.now() + Math.random().toString().substring(2,6),
          productId: prod.id,
          name: prod.name,
          price: prod.price || prod.value || 0,
          quantity: qty,
          maxStock: stockAvailable
        }
      ]);
    }

    // Reset input back to 1 for best UX flow
    setProductQuantitiesInput(prev => ({ ...prev, [prod.id]: 1 }));
  };

  const handleUpdateCartQty = (productId: string, newQty: number) => {
    const foundProduct = inventoryItems.find(it => it.id === productId);
    const maxPoss = foundProduct ? (foundProduct.stock || 0) : 99999;
    
    if (newQty <= 0) {
      setPosCart(posCart.filter(item => item.productId !== productId));
      return;
    }

    const cappedQty = Math.min(newQty, maxPoss);
    if (newQty > maxPoss) {
      alert(`⚠️ Límite de Inventario: El stock máximo disponible para este producto es de ${maxPoss} unidades.`);
    }

    setPosCart(posCart.map(item => 
      item.productId === productId 
         ? { ...item, quantity: cappedQty }
         : item
    ));
  };

  const handleRemovePosCartItem = (productId: string) => {
    setPosCart(posCart.filter(item => item.productId !== productId));
  };

  const handleSavePosInvoice = async () => {
    if (!user) {
      alert('Debe iniciar sesión para registrar y guardar ventas en el inventario.');
      return;
    }
    if (posCart.length === 0) {
      alert('🛒 El carrito de facturación está vacío. Elija un producto de inventario.');
      return;
    }

    setIsProcessingPos(true);
    try {
      // 1. Final confirmation check of stock availability
      const stockErrors: string[] = [];
      for (const item of posCart) {
        const matchingDbItem = inventoryItems.find(it => it.id === item.productId);
        if (matchingDbItem) {
          const currentDbStock = matchingDbItem.stock || 0;
          if (item.quantity > currentDbStock) {
            stockErrors.push(`"${matchingDbItem.name}" no tiene suficiente stock. Disponible: ${currentDbStock} u., Deseado: ${item.quantity} u.`);
          }
        }
      }

      if (stockErrors.length > 0) {
        alert(`❌ Error de Stock en Inventario:\n\n${stockErrors.join('\n')}\n\nPor favor retire o reduzca el producto.`);
        setIsProcessingPos(false);
        return;
      }

      // 2. Adjust stock levels in Firestore database automatically
      for (const item of posCart) {
        const dbItem = inventoryItems.find(it => it.id === item.productId);
        if (dbItem) {
          const originalStock = dbItem.stock || 0;
          const updatedStock = Math.max(0, originalStock - item.quantity);
          const updatedSold = (dbItem.totalSold || 0) + item.quantity;
          const updatedIncome = (dbItem.salesIncome || 0) + (item.quantity * item.price);

          await updateInventoryItem(user.uid, item.productId, {
            stock: updatedStock,
            totalSold: updatedSold,
            salesIncome: updatedIncome
          });
        }
      }

      // 3. Register financial transaction in cash flow ledger 
      const generatedCode = `POS-${Math.floor(100000 + Math.random() * 900000)}`;
      await addTransaction(user.uid, {
        amount: posGrandTotal,
        category: 'Otros',
        description: `Cobro en POS: Factura ${generatedCode} para ${posClientName}`,
        date: new Date().toISOString(),
        type: 'income'
      });

      // 4. Record as an Archived Invoice in the local invoice list so they have a backup print voucher
      const convertedItems: InvoiceItem[] = posCart.map(item => ({
        id: item.id,
        productId: item.productId,
        description: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const newHistoryInvoice: SavedInvoice = {
        id: 'inv-' + Date.now(),
        invoiceNumber: generatedCode,
        clientName: posClientName,
        clientRnc: posClientRnc,
        clientEmail: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        taxRate: posTaxRate,
        discount: posDiscount,
        currency: currency,
        status: 'paid', // Instant checkout invoices are fully paid
        items: convertedItems,
        issuerName: issuerName,
        issuerRnc: issuerRnc,
        issuerAddress: issuerAddress,
        issuerPhone: issuerPhone,
        issuerEmail: issuerEmail,
        subtotal: posSubtotal,
        taxAmount: posTaxAmount,
        grandTotal: posGrandTotal
      };

      const updatedHistory = [newHistoryInvoice, ...savedInvoices];
      setSavedInvoices(updatedHistory);

      // Save modal state details to show user beautiful receipt details
      setPosSuccessModal({
        invoiceNumber: generatedCode,
        clientName: posClientName,
        totalItems: posCart.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: posSubtotal,
        taxAmount: posTaxAmount,
        grandTotal: posGrandTotal,
        itemsSummary: posCart.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      });

      // Clear basket/cart
      setPosCart([]);
      setPosClientName('Cliente General POS');
      setPosClientRnc('');
      setPosDiscount(0);
    } catch (err) {
      console.error("Error al procesar el checkout POS:", err);
      alert("Ocurrió un error guardando y descontando del almacén. Por favor contacte soporte.");
    } finally {
      setIsProcessingPos(false);
    }
  };

  const handlePrintModalReceipt = () => {
    if (!posSuccessModal) return;
    try {
      const pWin = window.open('', '_blank');
      if (pWin) {
        pWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Recibo ${posSuccessModal.invoiceNumber}</title>
              <meta charset="utf-8">
              <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                body { font-family: 'Space Grotesk', sans-serif; }
                .ticket { font-family: 'JetBrains Mono', monospace; width: 80mm; padding: 5px; }
              </style>
            </head>
            <body class="bg-zinc-100 p-8 flex justify-center">
              <div class="bg-white p-6 rounded-2xl shadow-md border border-zinc-250 max-w-sm">
                <div class="text-center border-b border-dashed border-zinc-200 pb-4 mb-4">
                  <h2 class="font-bold text-sm tracking-tight">\${issuerName || 'Financiera Nova'}</h2>
                  <p class="text-[10px] text-zinc-500">\${issuerAddress || 'Santo Domingo, RD'}</p>
                  <p class="text-[9px] text-zinc-400">RNC: \${issuerRnc || '1-01-88432-1'}</p>
                  <p class="text-xs font-black text-red-800 mt-2">\${posSuccessModal.invoiceNumber}</p>
                </div>
                <div class="text-xs space-y-2 mb-4">
                  <p><strong>Cliente:</strong> \${posSuccessModal.clientName}</p>
                  <p><strong>Fecha:</strong> \${new Date().toLocaleDateString()} \${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <table class="w-full text-xs mb-4">
                  <thead>
                    <tr class="border-b border-zinc-200">
                      <th class="text-left pb-1 font-bold">Item</th>
                      <th class="text-center pb-1">Cant.</th>
                      <th class="text-right pb-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${posSuccessModal.itemsSummary.map((item: any) => \`
                      <tr>
                        <td class="py-1 truncate max-w-[150px] font-medium">\${item.name}</td>
                        <td class="py-1 text-center font-bold">\${item.quantity}</td>
                        <td class="py-1 text-right font-black">\${currency} \${(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
                <div class="border-t border-dashed border-zinc-200 pt-3 space-y-1.5 text-xs">
                  <div class="flex justify-between">
                    <span>Subtotal:</span>
                    <span>\${currency} \${posSuccessModal.subtotal.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>ITBIS (\${posTaxRate}%):</span>
                    <span>\${currency} \${posSuccessModal.taxAmount.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between font-black text-red-800 pt-1.5 border-t border-zinc-200">
                    <span>TOTAL:</span>
                    <span>\${currency} \${posSuccessModal.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
                <div class="text-center mt-6 pt-4 border-t border-dashed border-zinc-200">
                  <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">¡Gracias por su compra!</p>
                  <p class="text-[8px] text-zinc-400 mt-1">Transacción registrada exitosamente.</p>
                </div>
              </div>
            </body>
          </html>
        `);
        pWin.document.close();
        setTimeout(() => pWin.print(), 500);
      } else {
        window.print();
      }
    } catch (err) {
      console.warn("Popup blocked, executing fallback print:", err);
      window.print();
    }
  };

  // Handlers
  const handleProductSelectChange = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) {
      setNewItemDesc('');
      setNewItemPrice(0);
      return;
    }
    const found = inventoryItems.find(it => it.id === productId);
    if (found) {
      setNewItemDesc(found.name);
      setNewItemPrice(found.price || found.value || 0);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc || newItemPrice <= 0 || newItemQty <= 0) return;
    
    // Enforce billing stock checking limit
    if (isAddingProductMode && selectedProductId) {
      const found = inventoryItems.find(it => it.id === selectedProductId);
      if (found) {
        const currentStock = found.stock || 0;
        const alreadyAddedQty = items
          .filter(it => it.productId === selectedProductId)
          .reduce((sum, item) => sum + item.quantity, 0);

        if (alreadyAddedQty + newItemQty > currentStock) {
          alert(`⚠️ Error: No puede agregar esa cantidad.\n\nStock disponible en almacén: ${currentStock} unidades.\nYa ha agregado: ${alreadyAddedQty} unidades.\nCantidad propuesta: ${newItemQty} unidades.`);
          return;
        }
      }
    }

    const itemProductId = isAddingProductMode && selectedProductId ? selectedProductId : undefined;
    
    // Check if we can merge item
    const existingIndex = itemProductId 
      ? items.findIndex(it => it.productId === itemProductId)
      : -1;

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + Number(newItemQty)
      };
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          id: 'item-' + Date.now() + Math.random().toString().substring(2, 6),
          productId: itemProductId,
          description: newItemDesc,
          quantity: Number(newItemQty),
          price: Number(newItemPrice)
        }
      ]);
    }
    
    // reset input
    setSelectedProductId('');
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleRemoveItem = (id: string) => {
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

  const selectedProduct = isAddingProductMode && selectedProductId 
    ? inventoryItems.find(it => it.id === selectedProductId)
    : null;
    
  const currentStock = selectedProduct ? (selectedProduct.stock || 0) : 0;

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

      {/* Subtab Navigation Selector */}
      <div className="flex gap-2 border-b border-zinc-200 pb-0.5 no-print mb-4">
        <button
          onClick={() => setBillingSubTab('pos_calculator')}
          className={cn(
            "pb-3 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2",
            billingSubTab === 'pos_calculator' 
              ? "border-red-800 text-red-800" 
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          <Boxes className="w-4 h-4 text-red-800" />
          🛍️ Cálculo y Facturación Almacén
        </button>
        <button
          onClick={() => setBillingSubTab('classic_billing')}
          className={cn(
            "pb-3 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2",
            billingSubTab === 'classic_billing' 
              ? "border-red-800 text-red-800" 
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          )}
        >
          <FileText className="w-4 h-4" />
          📄 Factura Formal / Servicios Libres
        </button>
      </div>

      {billingSubTab === 'classic_billing' ? (
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

            <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsAddingProductMode(true);
                  setSelectedProductId('');
                  setNewItemDesc('');
                  setNewItemPrice(0);
                  setNewItemQty(1);
                }}
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  isAddingProductMode ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                <Boxes className="w-3.5 h-3.5 text-red-800" />
                Producto de Almacén
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingProductMode(false);
                  setSelectedProductId('');
                  setNewItemDesc('');
                  setNewItemPrice(0);
                  setNewItemQty(1);
                }}
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  !isAddingProductMode ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                Concepto Manual / Servicio
              </button>
            </div>

            <form onSubmit={handleAddItem} className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-150 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-800">
                {isAddingProductMode ? 'Vender Producto en Factura' : 'Agregar Cargo Profesional'}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {isAddingProductMode ? (
                  <div className="sm:col-span-6">
                    <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Seleccionar Producto *</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none font-bold text-zinc-800"
                    >
                      <option value="">-- Elija un Producto Registrado --</option>
                      {inventoryItems.map((prod) => (
                        <option key={prod.id} value={prod.id} disabled={(prod.stock || 0) <= 0}>
                          {prod.name} (Stock: {prod.stock || 0} c/u • {currency} {(prod.price || prod.value || 0).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-6">
                    <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Descripción del concepto *</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Alquiler de local o consulta..."
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                    />
                  </div>
                )}
                
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Cant.</label>
                  <input 
                    type="number" 
                    min="1"
                    max={selectedProduct ? currentStock : undefined}
                    className={cn(
                      "w-full px-3 py-2 bg-white border rounded-xl text-xs outline-none font-semibold",
                      selectedProduct && newItemQty > currentStock ? "border-red-500 text-red-700 font-black" : "border-zinc-200"
                    )}
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Precio Unit. ({currency})</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-red-800 outline-none font-bold"
                    value={newItemPrice || ''}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                  />
                </div>
                
                <div className="sm:col-span-1">
                  <button 
                    type="submit"
                    disabled={selectedProduct && newItemQty > currentStock}
                    className={cn(
                      "w-full p-2 text-white rounded-xl flex items-center justify-center transition-all h-9",
                      selectedProduct && newItemQty > currentStock 
                        ? "bg-zinc-350 cursor-not-allowed text-zinc-400" 
                        : "bg-red-800 hover:bg-red-900"
                    )}
                    title={selectedProduct && newItemQty > currentStock ? "No puede vender más que el inventario" : "Añadir concepto"}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {selectedProduct && (
                  <div className="sm:col-span-12 mt-1 flex items-center justify-between bg-zinc-50 border border-zinc-150 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      {newItemQty > currentStock ? (
                        <AlertCircle className="w-4.5 h-4.5 text-red-650 animate-bounce" />
                      ) : (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                      )}
                      <div className="text-left">
                        <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Control de Existencias:</p>
                        <p className={cn(
                          "text-xs font-black",
                          newItemQty > currentStock ? "text-red-750" : "text-emerald-750"
                        )}>
                           {currentStock} unidades registradas en su inventario.
                        </p>
                      </div>
                    </div>
                    
                    {newItemQty > currentStock ? (
                      <span className="text-[10px] text-red-800 font-extrabold bg-red-50 border border-red-150 rounded-lg px-2 py-0.5">
                        ⚠️ No puede vender más que la cantidad disponible ({currentStock})
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-150 rounded-lg px-2 py-0.5">
                        ✓ Rango Válido
                      </span>
                    )}
                  </div>
                )}
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
      ) : (
        <PosCalculator 
          user={user}
          inventoryItems={inventoryItems}
          savedInvoices={savedInvoices}
          setSavedInvoices={setSavedInvoices}
          currency={currency}
          issuerName={issuerName}
          issuerRnc={issuerRnc}
          issuerAddress={issuerAddress}
          issuerPhone={issuerPhone}
          issuerEmail={issuerEmail}
        />
      )}

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
