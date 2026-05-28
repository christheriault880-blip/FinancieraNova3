import { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  ReceiptText, 
  CheckCircle2, 
  Printer, 
  Trash2,
  Building,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { subscribeToInventory, updateInventoryItem, addTransaction } from '../services/firestoreService';
import { InventoryItem } from '../types';

const getWhatsAppShareUrl = (invoice: any) => {
  if (!invoice) return '';
  const isPos = invoice.invoiceNumber && invoice.invoiceNumber.startsWith('POS');
  const emojiTitle = isPos ? '🛍️ *RECIBO DE COMPRA (ALMACÉN)*' : '📄 *FACTURA DE SERVICIOS*';
  
  const itemsText = invoice.items && invoice.items.length > 0 
    ? invoice.items.map((item: any) => `- ${item.quantity}x ${item.description || item.name} (${invoice.currency || 'RD$'} ${item.price.toLocaleString()} c/u) => ${invoice.currency || 'RD$'} ${(item.quantity * item.price).toLocaleString()}`).join('\n')
    : 'No hay detalles de conceptos.';

  const taxLabel = invoice.taxRate ? `ITBIS (${invoice.taxRate}%):` : 'Impuestos:';
  
  const text = `${emojiTitle}
----------------------------------------
*Emisor:* ${invoice.issuerName || 'Financiera Nova'}
*RNC Emisor:* ${invoice.issuerRnc || '1-01-88432-1'}
*No. Factura:* ${invoice.invoiceNumber}
*Fecha:* ${invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : new Date().toLocaleDateString()}
----------------------------------------
*Cliente:* ${invoice.clientName}
${invoice.clientRnc ? `*RNC Cliente:* ${invoice.clientRnc}\n` : ''}----------------------------------------
*Detalle:*
${itemsText}
----------------------------------------
*Subtotal:* ${invoice.currency || 'RD$'} ${invoice.subtotal.toLocaleString()}
${invoice.taxAmount ? `*${taxLabel}* ${invoice.currency || 'RD$'} ${invoice.taxAmount.toLocaleString()}\n` : ''}${invoice.discount ? `*Descuento:* -${invoice.currency || 'RD$'} ${invoice.discount.toLocaleString()}\n` : ''}*TOTAL NETO:* ${invoice.currency || 'RD$'} ${invoice.grandTotal.toLocaleString()}
---------
*Estado:* ${invoice.status === 'paid' ? 'COBRADA / PAGADA ✅' : 'PENDIENTE DE PAGO ⚠️'}

¡Gracias por su preferencia!
Enviado desde *Financiera Nova App*`;

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

export default function PosCalculator() {
  const { user } = useAuth();
  
  // Real-time states managed internally
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [savedInvoices, setSavedInvoices] = useState<any[]>(() => {
    const saved = localStorage.getItem('nova_saved_invoices');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Business / Company details loaded and stored persistently in localStorage
  const [issuerName, setIssuerName] = useState(() => localStorage.getItem('nova_pos_issuer_name') || 'Financiera Nova');
  const [issuerRnc, setIssuerRnc] = useState(() => localStorage.getItem('nova_pos_issuer_rnc') || '1-01-88432-1');
  const [issuerAddress, setIssuerAddress] = useState(() => localStorage.getItem('nova_pos_issuer_address') || 'Av. Winston Churchill, Plaza Central, Santo Domingo');
  const [issuerPhone, setIssuerPhone] = useState(() => localStorage.getItem('nova_pos_issuer_phone') || '(809) 555-0199');
  const [issuerEmail, setIssuerEmail] = useState(() => localStorage.getItem('nova_pos_issuer_email') || 'soporte@financieranova.com.do');

  // Toggle for configuration card
  const [showConfig, setShowConfig] = useState(false);

  const [posSearchSearch, setPosSearchSearch] = useState('');
  const [posCart, setPosCart] = useState<{ id: string; productId: string; name: string; price: number; quantity: number; maxStock: number }[]>([]);
  const [posClientName, setPosClientName] = useState('Cliente General POS');
  const [posClientRnc, setPosClientRnc] = useState('');
  const [posTaxRate, setPosTaxRate] = useState(18); // default ITBIS 18%
  const [posDiscount, setPosDiscount] = useState(0); 
  const [isProcessingPos, setIsProcessingPos] = useState(false);
  const [productQuantitiesInput, setProductQuantitiesInput] = useState<Record<string, number>>({});
  const [posSuccessModal, setPosSuccessModal] = useState<{
    invoiceNumber: string;
    clientName: string;
    totalItems: number;
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
    itemsSummary: { productId: string; name: string; price: number; quantity: number }[];
  } | null>(null);

  const [isCapturingPos, setIsCapturingPos] = useState(false);
  const [posShareMessage, setPosShareMessage] = useState<string | null>(null);

  const handleSharePosReceiptImage = async () => {
    const element = document.getElementById('pos-success-receipt-card');
    if (!element) return;

    // Mensaje descriptivo para WhatsApp
    const textMsg = `*Recibo de compra (Almacén):* Hola, adjunto el recibo de compra No. ${posSuccessModal?.invoiceNumber || 'POS'} por valor de ${currency} ${posSuccessModal?.grandTotal.toLocaleString()}. *(Por favor, haz Pegar (Ctrl+V) aquí para enviar la foto del tique)*`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`;
    
    // Abrir inmediatamente síncronamente en el hilo del click para evitar que sea bloqueado por el navegador
    const whatsAppWindow = window.open(shareUrl, '_blank');

    setIsCapturingPos(true);
    setPosShareMessage(null);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // High resolution capture
        useCORS: true,
        logging: false
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("No se pudo generar el archivo de imagen.");
        }

        const file = new File([blob], `Recibo_${posSuccessModal?.invoiceNumber || 'POS'}.png`, { type: 'image/png' });

        // Intenta usar de forma prioritaria la API nativa de compartir
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Recibo ${posSuccessModal?.invoiceNumber || 'POS'}`,
              text: `Hola, adjunto el recibo de compra del almacén No. ${posSuccessModal?.invoiceNumber || 'POS'}.`
            });
            setPosShareMessage("¡Recibo compartido exitosamente!");
            return;
          } catch (shareErr) {
            console.warn("El compartir nativo fue cancelado o no es soportado:", shareErr);
          }
        }

        // Descarga directa de la imagen como respaldo
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Recibo_${posSuccessModal?.invoiceNumber || 'POS'}.png`;
        link.click();

        // Intenta copiar la imagen al portapapeles para facilitar el Pegar (Ctrl+V) en WhatsApp
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          setPosShareMessage("¡Tíquet descargado y copiado al portapapeles! Ve a la pestaña de WhatsApp abierta y haz Pegar (Ctrl+V).");
        } catch (clipErr) {
          console.warn("Copiado al portapapeles bloqueado por el navegador:", clipErr);
          setPosShareMessage("¡Tíquet descargado como imagen! Sube o adjunta la imagen descargada en WhatsApp.");
        }

        // Si la ventana de WhatsApp fue bloqueada, la reintentamos abrir aquí
        if (!whatsAppWindow || whatsAppWindow.closed) {
          window.open(shareUrl, '_blank');
        }

      }, 'image/png');
    } catch (err) {
      console.error("Error al generar imagen de recibo POS:", err);
      alert("No se pudo procesar la imagen del recibo.");
    } finally {
      setIsCapturingPos(false);
    }
  };

  const currency = 'RD$';

  // Sincronizar listas de facturas en localStorage
  useEffect(() => {
    localStorage.setItem('nova_saved_invoices', JSON.stringify(savedInvoices));
  }, [savedInvoices]);

  // Sincronizar cambios de datos de la empresa en localStorage para persistencia real
  useEffect(() => {
    localStorage.setItem('nova_pos_issuer_name', issuerName);
  }, [issuerName]);
  useEffect(() => {
    localStorage.setItem('nova_pos_issuer_rnc', issuerRnc);
  }, [issuerRnc]);
  useEffect(() => {
    localStorage.setItem('nova_pos_issuer_address', issuerAddress);
  }, [issuerAddress]);
  useEffect(() => {
    localStorage.setItem('nova_pos_issuer_phone', issuerPhone);
  }, [issuerPhone]);
  useEffect(() => {
    localStorage.setItem('nova_pos_issuer_email', issuerEmail);
  }, [issuerEmail]);

  // Suscribirse a inventario real de Firebase
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToInventory(user.uid, (data) => {
      setInventoryItems(data);
    });
    return () => unsubscribe();
  }, [user]);

  // Add Product to Cart, validating stock levels strictly
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

  // Checkout mechanism that subtracts warehouse stock level and logs transaction
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
      // 1. Double check available levels in state
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

      // 4. Record as an Archived Invoice in local logs for histories & printing
      const convertedItems = posCart.map(item => ({
        id: item.id,
        productId: item.productId,
        description: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const newHistoryInvoice = {
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
        status: 'paid', // Instant POS checkouts are always paid
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

      setSavedInvoices(prev => [newHistoryInvoice, ...prev]);

      // Pop Receipt details modal
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
              <div class="bg-white p-6 rounded-2xl shadow-md border border-zinc-250 w-[80mm]">
                <div class="text-center border-b border-dashed border-zinc-200 pb-4 mb-4">
                  <h2 class="font-bold text-sm tracking-tight">${issuerName || 'Financiera Nova'}</h2>
                  <p class="text-[10px] text-zinc-500">${issuerAddress || 'Santo Domingo, RD'}</p>
                  <p class="text-[9px] text-zinc-400">RNC: ${issuerRnc || '1-01-88432-1'}</p>
                  <p class="text-xs font-black text-red-800 mt-2">${posSuccessModal.invoiceNumber}</p>
                </div>
                <div class="text-xs space-y-2 mb-4">
                  <p><strong>Cliente:</strong> ${posSuccessModal.clientName}</p>
                  <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <table class="w-full text-xs mb-4">
                  <thead>
                    <tr class="border-b border-zinc-200 text-left">
                      <th class="pb-1 font-bold">Item</th>
                      <th class="text-center pb-1">Cant.</th>
                      <th class="text-right pb-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${posSuccessModal.itemsSummary.map((item: any) => `
                      <tr>
                        <td class="py-1 truncate max-w-[150px] font-medium">${item.name}</td>
                        <td class="py-1 text-center font-bold">${item.quantity}</td>
                        <td class="py-1 text-right font-black">${currency} ${(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div class="border-t border-dashed border-zinc-200 pt-3 space-y-1.5 text-xs">
                  <div class="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${currency} ${posSuccessModal.subtotal.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>ITBIS (${posTaxRate}%):</span>
                    <span>${currency} ${posSuccessModal.taxAmount.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between font-black text-red-800 pt-1.5 border-t border-zinc-200">
                    <span>TOTAL:</span>
                    <span>${currency} ${posSuccessModal.grandTotal.toLocaleString()}</span>
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

  // Live POS calculations
  const posSubtotal = posCart.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
  const posTaxAmount = (posSubtotal * posTaxRate) / 100;
  const posGrandTotal = Math.max(0, posSubtotal + posTaxAmount - posDiscount);

  return (
    <div className="space-y-6">
      {/* Header and Company Config Box */}
      <div className="glass-card bg-white p-6 border border-zinc-150 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
              <Boxes className="w-6 h-6 text-red-800 animate-pulse" />
              Cálculo y Facturación Almacén
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Selecciona productos directamente desde tu inventario de almacén físico. Al cobrar, el stock se descontará automáticamente y se registrará un ingreso.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 bg-zinc-105-color text-zinc-900 border border-zinc-200 hover:bg-zinc-100 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-xs"
          >
            <Building className="w-4 h-4 text-red-800" />
            {showConfig ? 'Ocultar Datos de Empresa' : 'Datos de Mi Negocio/Empresa 🏢'}
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Persistent Business details configuration form drawer */}
        {showConfig && (
          <div className="mt-6 pt-6 border-t border-zinc-150 bg-zinc-50/50 p-5 rounded-2xl border border-zinc-200">
            <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-red-850" />
              Configurar Datos de Tu Empresa o Negocio
            </h3>
            <p className="text-[11px] text-zinc-500 mb-4">Estos datos saldrán automáticamente impresos en la cabecera de tus tiques y recibos de venta.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Nombre Comercial de la Empresa</label>
                <input 
                  type="text"
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  placeholder="Ej. Comercializadora Pérez SRL"
                  className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-xl text-xs font-bold focus:ring-1 focus:ring-red-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-455 uppercase mb-1">RNC / Registro Único</label>
                <input 
                  type="text"
                  value={issuerRnc}
                  onChange={(e) => setIssuerRnc(e.target.value)}
                  placeholder="Ej. 1-01-88432-1"
                  className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-xl text-xs font-bold focus:ring-1 focus:ring-red-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-455 uppercase mb-1">Teléfono de Contacto</label>
                <input 
                  type="text"
                  value={issuerPhone}
                  onChange={(e) => setIssuerPhone(e.target.value)}
                  placeholder="Ej. (809) 555-0100"
                  className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-xl text-xs font-bold focus:ring-1 focus:ring-red-800 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] font-bold text-zinc-455 uppercase mb-1">Dirección Física Completa</label>
                <input 
                  type="text"
                  value={issuerAddress}
                  onChange={(e) => setIssuerAddress(e.target.value)}
                  placeholder="Ej. Calle Duarte #20, Santo Domingo, RD"
                  className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-xl text-xs font-bold focus:ring-1 focus:ring-red-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-455 uppercase mb-1">Correo Electrónico</label>
                <input 
                  type="email"
                  value={issuerEmail}
                  onChange={(e) => setIssuerEmail(e.target.value)}
                  placeholder="Ej. ventas@negocio.com"
                  className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-xl text-xs font-bold focus:ring-1 focus:ring-red-800 outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 justify-end">
              <span className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1.5 bg-emerald-50 border border-emerald-105-color px-3 py-1 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guardado automáticamente en navegador
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: List of inventory products */}
        <div className="lg:col-span-7 space-y-4 no-print">
          <div className="glass-card bg-white p-6 border border-zinc-150 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
                  <Boxes className="w-4.5 h-4.5 text-red-850" />
                  Catálogo del Almacén Físico
                </h3>
                <p className="text-[11px] text-zinc-500">Cada producto tiene su precio y existencia disponible. Elija la cantidad comprada debidamente.</p>
              </div>
              
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Buscar en almacén..."
                  value={posSearchSearch}
                  onChange={(e) => setPosSearchSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-800 focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {inventoryItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-3xl">
                <Boxes className="w-10 h-10 mx-auto text-zinc-300 mb-3 animate-bounce" />
                <p className="font-bold">No tiene productos registrados en su inventario.</p>
                <p className="text-[10px] text-zinc-500 mt-1">Vaya a la sección "Inventario" para registrar productos antes de facturar.</p>
              </div>
            ) : (
              (() => {
                const filtered = inventoryItems.filter(p => p.name.toLowerCase().includes(posSearchSearch.toLowerCase()));
                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-zinc-400 text-xs">
                      Ningún producto coincide con la búsqueda "{posSearchSearch}"
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filtered.map(prod => {
                      const stock = prod.stock || 0;
                      const price = prod.price || prod.value || 0;
                      const currentInputQty = productQuantitiesInput[prod.id] || 1;
                      const isExceeded = currentInputQty > stock;
                      const isOutOfStock = stock <= 0;

                      return (
                        <div 
                          key={prod.id} 
                          className={cn(
                            "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 bg-zinc-50/50",
                            isOutOfStock 
                              ? "border-zinc-200 opacity-60" 
                              : isExceeded 
                                ? "border-red-200 bg-red-50/5" 
                                : "border-zinc-150 hover:border-red-150 hover:bg-white hover:shadow-sm"
                          )}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-xs font-black text-zinc-900 uppercase truncate leading-snug">{prod.name}</h4>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider",
                                isOutOfStock 
                                  ? "bg-zinc-100 text-zinc-500 border-zinc-200" 
                                  : stock <= 5 
                                    ? "bg-amber-50 text-amber-700 border-amber-200" 
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}>
                                {isOutOfStock ? 'Agotado' : `Existencia: ${stock} u.`}
                              </span>
                            </div>

                            <p className="text-sm font-black text-zinc-905 mt-1">{currency} {price.toLocaleString()}</p>
                            <p className="text-[9px] text-zinc-400 leading-normal mt-0.5">Ref/Categoría: {prod.category || 'Almacén'}</p>
                          </div>

                          {/* Quantity selection inside Product list card */}
                          {!isOutOfStock && (
                            <div className="space-y-2 pt-2 border-t border-zinc-150 flex flex-col">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9px] font-bold text-zinc-450 uppercase">Cant. Vendida:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setProductQuantitiesInput(prev => ({
                                      ...prev,
                                      [prod.id]: Math.max(1, currentInputQty - 1)
                                    }))}
                                    className="w-5 h-5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 font-bold text-xs flex items-center justify-center transition-all"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number" 
                                    min="1"
                                    max={stock}
                                    value={currentInputQty}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setProductQuantitiesInput(prev => ({
                                        ...prev,
                                        [prod.id]: val
                                      }));
                                    }}
                                    className={cn(
                                      "w-12 text-center text-xs font-bold py-0.5 bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-red-800",
                                      isExceeded ? "border-red-500 text-red-900 font-extrabold" : "border-zinc-250 text-zinc-800"
                                    )}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setProductQuantitiesInput(prev => ({
                                      ...prev,
                                      [prod.id]: Math.min(stock, currentInputQty + 1)
                                    }))}
                                    className="w-5 h-5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 font-bold text-xs flex items-center justify-center transition-all"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <button 
                                type="button"
                                disabled={isExceeded}
                                onClick={() => handleAddProductToPosCart(prod)}
                                className={cn(
                                  "w-full py-2 rounded-xl text-[10px] font-black tracking-wide uppercase flex items-center justify-center gap-1 transition-all text-white mt-1",
                                  isExceeded 
                                    ? "bg-zinc-350 cursor-not-allowed select-none" 
                                    : "bg-red-800 hover:bg-red-900 shadow-xs"
                                )}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                {isExceeded ? 'Stock Superado ⚠️' : 'Agregar a Factura 🛒'}
                              </button>

                              {isExceeded && (
                                <p className="text-[9px] text-red-750 font-black text-center mt-1 animate-pulse">
                                  ⚠️ No puede agregar {currentInputQty}. Solo hay {stock} papitas/aguas/ítems.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Right Column: Checkout Cartesian Bill details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card bg-white p-6 border border-zinc-150 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-100 pb-3">
              <ReceiptText className="w-4.5 h-4.5 text-red-850" />
              Cálculo de Factura (Detalles)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-zinc-450 uppercase tracking-wider mb-1">Nombre Completo del Cliente *</label>
                <input 
                  type="text"
                  value={posClientName}
                  onChange={(e) => setPosClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-455 uppercase tracking-wider mb-1">RNC / Cédula</label>
                  <input 
                    type="text"
                    value={posClientRnc}
                    onChange={(e) => setPosClientRnc(e.target.value)}
                    placeholder="RNC (Opcional)"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-455 uppercase tracking-wider mb-1">Tasas de ITBIS (%)</label>
                  <select
                    value={posTaxRate}
                    onChange={(e) => setPosTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-red-800 focus:bg-white outline-none"
                  >
                    <option value={0}>Sin Impuesto (0%)</option>
                    <option value={18}>18% ITBIS General</option>
                    <option value={16}>16% IVA Reducido</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cart items list with subtotal per product */}
            <div className="border-t border-b border-zinc-100 py-4 space-y-3 max-h-64 overflow-y-auto pr-1">
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Conceptos / Productos Agregados</div>
              {posCart.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-150 rounded-2xl bg-zinc-50/50">
                  Carrito vacío. Haga clic en "Agregar a Factura" en el catálogo.
                </div>
              ) : (
                posCart.map(item => {
                  const itemSubtotal = item.quantity * item.price;
                  return (
                    <div key={item.id} className="flex items-center justify-between text-xs gap-3.5 bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-zinc-900 truncate uppercase">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-zinc-400 font-bold">
                            {currency} {item.price.toLocaleString()} c/u
                          </span>
                          <span className="text-[10px] text-zinc-300">|</span>
                          <span className="text-[10px] text-zinc-400 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded">
                            Cant: {item.quantity} u.
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          {/* Live subtotal per product */}
                          <p className="text-[8px] text-zinc-400 uppercase font-black tracking-wide">Subtotal</p>
                          <p className="font-extrabold text-zinc-950 font-mono text-[11px]">
                            {currency} {itemSubtotal.toLocaleString()}
                          </p>
                        </div>

                        {/* Adjust & Remove row directly inside cart */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.productId, item.quantity - 1)}
                            className="w-5 h-5 rounded bg-zinc-100 hover:bg-zinc-200 font-black text-xs text-zinc-650 flex items-center justify-center transition-all"
                            title="Disminuir"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.productId, item.quantity + 1)}
                            className="w-5 h-5 rounded bg-zinc-100 hover:bg-zinc-200 font-black text-xs text-zinc-650 flex items-center justify-center transition-all"
                            title="Aumentar"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePosCartItem(item.productId)}
                            className="p-1 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Eliminar de factura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations live subtotals & grand totals */}
            <div className="space-y-2 pt-1 border-b border-zinc-100 pb-3">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal Neto:</span>
                <span className="font-bold text-zinc-800">{currency} {posSubtotal.toLocaleString()}</span>
              </div>
              {posTaxAmount > 0 && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>ITBIS de Ley ({posTaxRate}%):</span>
                  <span className="font-bold text-zinc-800">{currency} {posTaxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 text-red-800 font-black">
                <span>TOTAL GENERAL:</span>
                <span className="font-bold text-base font-mono">{currency} {posGrandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Button to process document, subtract stock, and output invoice records */}
            <button
              type="button"
              disabled={posCart.length === 0 || isProcessingPos}
              onClick={handleSavePosInvoice}
              className={cn(
                "w-full py-3.5 rounded-2xl text-xs font-extrabold tracking-wider uppercase text-white flex items-center justify-center gap-2 transition-all shadow-md",
                posCart.length === 0 
                  ? "bg-zinc-300 shadow-none cursor-not-allowed text-zinc-400" 
                  : "bg-red-800 hover:bg-red-900 shadow-red-150"
              )}
            >
              {isProcessingPos ? (
                <span className="animate-pulse">Descontando niveles de almacén...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 animate-bounce" />
                  Guardar y Descontar Inventario 🚀
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* POS Success and voucher print modal */}
      {posSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-sm w-full p-6 space-y-5 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-700">
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-base font-black text-zinc-900 tracking-tight uppercase">¡Factura Guardada!</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">Las existencias de almacén se han descontado automáticamente.</p>
            </div>

            {/* Este es el contenedor del tíquet físico que se convertirá en imagen */}
            <div 
              id="pos-success-receipt-card" 
              className="bg-white border border-zinc-200 p-5 rounded-2xl text-left text-xs space-y-3 shadow-xs select-text text-zinc-900 mx-auto w-full block"
            >
              <div className="text-center border-b border-dashed border-zinc-200 pb-3 mb-3">
                <h5 className="font-extrabold text-[13px] tracking-tight uppercase text-zinc-900">
                  {issuerName || 'Financiera Nova'}
                </h5>
                <p className="text-[10px] text-zinc-500">{issuerAddress || 'Santo Domingo, RD'}</p>
                <p className="text-[9px] text-zinc-400 font-bold">RNC: {issuerRnc || '1-01-88432-1'}</p>
                <div className="mt-2 inline-block bg-zinc-100 px-2.5 py-1 rounded-md text-[10px] font-mono text-zinc-700 font-bold">
                  {posSuccessModal.invoiceNumber}
                </div>
              </div>

              <div className="text-[11px] space-y-1 text-zinc-600 border-b border-zinc-100 pb-2">
                <p><strong>Cliente:</strong> {posSuccessModal.clientName}</p>
                {posClientRnc && <p><strong>RNC:</strong> {posClientRnc}</p>}
                <p><strong>Fecha:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-zinc-400 font-bold text-[9px] uppercase border-b border-zinc-100 pb-1">
                  <span>Concepto</span>
                  <span>Total</span>
                </div>
                {posSuccessModal.itemsSummary.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="font-semibold text-zinc-800 truncate max-w-[190px]">{item.quantity}x {item.name}</span>
                    <span className="font-mono text-zinc-900 font-bold">{currency} {(item.quantity * item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-zinc-200 pt-2.5 mt-2 space-y-1">
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>Subtotal:</span>
                  <span>{currency} {posSuccessModal.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>ITBIS ({posTaxRate}%):</span>
                  <span>{currency} {posSuccessModal.taxAmount.toLocaleString()}</span>
                </div>
                {posDiscount > 0 && (
                  <div className="flex justify-between text-zinc-500 text-[11px]">
                    <span>Descuento:</span>
                    <span>-{currency} {posDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-red-850 pt-2 border-t border-zinc-100 text-xs font-serif">
                  <span>TOTAL NETO:</span>
                  <span className="font-mono font-black">{currency} {posSuccessModal.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-zinc-200">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">¡Gracias por su compra!</p>
                <p className="text-[8px] text-zinc-400 mt-1">Soporte: {issuerPhone || issuerEmail}</p>
              </div>
            </div>

            {posShareMessage && (
              <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold p-3 rounded-xl border border-emerald-150 py-2 text-left">
                💬 {posShareMessage}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintModalReceipt}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Imprimir Tique
                </button>
                <button
                  type="button"
                  onClick={() => setPosSuccessModal(null)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-850 rounded-xl text-xs font-black transition-all"
                >
                  Listo / Nueva
                </button>
              </div>

              <button
                type="button"
                disabled={isCapturingPos}
                onClick={handleSharePosReceiptImage}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-350 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isCapturingPos ? (
                  <span className="animate-pulse">Generando Imagen...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.012 3c-4.965 0-9.01 4.05-9.01 9.01 0 1.583.411 3.125 1.196 4.49l-1.196 4.5 4.603-1.21A8.93 8.93 0 0 0 12.011 21c4.966 0 9.01-4.048 9.01-9.009S16.977 3 12.012 3zm4.992 12.871c-.206.581-1.014 1.135-1.564 1.205-.5.06-1.149.079-1.85-.152-.619-.203-1.5-.544-2.541-1.002-4.414-1.942-7.237-6.526-7.457-6.824-.22-.298-1.782-2.396-1.782-4.572s1.114-3.243 1.513-3.69c.399-.446.879-.558 1.171-.558.292 0 .584.004.839.015.267.012.623-.105.973.743.361.874 1.233 3.033 1.338 3.256.106.223.176.48.028.773-.148.296-.223.479-.444.739-.22.259-.464.577-.662.775-.22.22-.453.46-.195.903.257.442.1.848 1.201 1.838 1.417 1.266 2.613 1.657 2.978 1.838.365.181.579.152.793-.1s.924-1.082 1.174-1.455c.249-.373.499-.311.839-.185.341.127 2.162 1.026 2.536 1.212.373.187.623.277.712.433.09.155.09.897-.116 1.478z"/>
                    </svg>
                    Compartir en WhatsApp 💬
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
