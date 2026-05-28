import { useState, useRef, useEffect } from 'react';
import { safeHtml2canvas } from '../lib/pdfHelper';
import { jsPDF } from 'jspdf';
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
  AlertCircle,
  Upload
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { 
  subscribeToInventory, 
  updateInventoryItem, 
  addTransaction 
} from '../services/firestoreService';
import { InventoryItem } from '../types';

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
  issuerLogo?: string;
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

export default function Billing() {
  const { user, profile } = useAuth();
  
  // Custom Issuer/Company Details Configuration
  const [issuerName, setIssuerName] = useState(() => localStorage.getItem('nova_billing_issuer_name') || 'Financiera Nova');
  const [issuerRnc, setIssuerRnc] = useState(() => localStorage.getItem('nova_billing_issuer_rnc') || '1-01-88432-1');
  const [issuerAddress, setIssuerAddress] = useState(() => localStorage.getItem('nova_billing_issuer_address') || 'Av. Winston Churchill, Plaza Central, Santo Domingo');
  const [issuerPhone, setIssuerPhone] = useState(() => localStorage.getItem('nova_billing_issuer_phone') || '(809) 555-0199');
  const [issuerEmail, setIssuerEmail] = useState(() => localStorage.getItem('nova_billing_issuer_email') || 'soporte@financieranova.com.do');
  const [issuerLogo, setIssuerLogo] = useState(() => localStorage.getItem('nova_billing_issuer_logo') || '');

  // Persist Billing Company settings in localStorage
  useEffect(() => {
    localStorage.setItem('nova_billing_issuer_name', issuerName);
  }, [issuerName]);
  useEffect(() => {
    localStorage.setItem('nova_billing_issuer_rnc', issuerRnc);
  }, [issuerRnc]);
  useEffect(() => {
    localStorage.setItem('nova_billing_issuer_address', issuerAddress);
  }, [issuerAddress]);
  useEffect(() => {
    localStorage.setItem('nova_billing_issuer_phone', issuerPhone);
  }, [issuerPhone]);
  useEffect(() => {
    localStorage.setItem('nova_billing_issuer_email', issuerEmail);
  }, [issuerEmail]);
  useEffect(() => {
    localStorage.setItem('nova_billing_issuer_logo', issuerLogo);
  }, [issuerLogo]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("La imagen es muy grande. Por favor elige una menor a 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setIssuerLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setIssuerLogo('');
  };

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

  // WhatsApp Share PDF Modal state variables
  const [whatsAppModalInvoice, setWhatsAppModalInvoice] = useState<SavedInvoice | null>(null);
  const [isCapturingHistory, setIsCapturingHistory] = useState(false);
  const [historyShareMessage, setHistoryShareMessage] = useState<string | null>(null);

  const handlePrintBotoneraTicket = (inv: SavedInvoice) => {
    try {
      const pWin = window.open('', '_blank');
      if (pWin) {
        pWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Ticket ${inv.invoiceNumber}</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                body {
                  font-family: 'JetBrains Mono', monospace;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  background-color: #ffffff;
                  margin: 0;
                  padding: 0;
                  width: 58mm;
                }
                @page {
                  size: 58mm auto;
                  margin: 0;
                }
                @media print {
                  body {
                    width: 58mm;
                    margin: 0;
                    padding: 2mm 1mm;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              </style>
            </head>
            <body class="text-zinc-900 text-[9.5px] p-[2mm]">
              <div class="w-full">
                <!-- Header -->
                <div class="text-center border-b border-dashed border-zinc-300 pb-2 mb-2 flex flex-col items-center">
                  ${(inv.issuerLogo || issuerLogo) ? `
                    <img 
                      src="${inv.issuerLogo || issuerLogo}" 
                      alt="Logo" 
                      style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; margin-bottom: 4px;" 
                    />
                  ` : ''}
                  <h2 class="font-extrabold text-[11px] tracking-tight uppercase leading-tight">${inv.issuerName || 'Financiera Nova'}</h2>
                  <p class="text-[8px] text-zinc-500 leading-normal mt-0.5">${inv.issuerAddress || 'Santo Domingo, RD'}</p>
                  <p class="text-[8px] text-zinc-400 leading-normal">RNC: ${inv.issuerRnc || '1-01-88432-1'}</p>
                  <p class="text-[8px] text-zinc-400 leading-normal">TEL: ${inv.issuerPhone || '(809) 555-0199'}</p>
                  
                  <div class="mt-1.5 py-0.5 px-2 bg-zinc-100 rounded text-[9px] font-black inline-block text-zinc-800 border border-zinc-200">
                    TIQUE: ${inv.invoiceNumber}
                  </div>
                </div>

                <!-- Info Invoice -->
                <div class="space-y-0.5 text-[8px] border-b border-dashed border-zinc-200 pb-2 mb-2 leading-none">
                  <p><span class="font-bold">Cliente:</span> ${inv.clientName}</p>
                  ${inv.clientRnc ? `<p><span class="font-bold">RNC/Céd:</span> ${inv.clientRnc}</p>` : ''}
                  <p><span class="font-bold">Fecha:</span> ${inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>

                <!-- Items Table -->
                <table class="w-full text-[8px] mb-2 leading-tight">
                  <thead>
                    <tr class="border-b border-zinc-300 text-left">
                      <th class="pb-1 font-bold">DESCRIPCIÓN</th>
                      <th class="text-center pb-1 w-[10mm]">CANT.</th>
                      <th class="text-right pb-1 w-[16mm]">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${inv.items.map((item: any) => `
                      <tr class="border-b border-zinc-100 last:border-none">
                        <td class="py-1 break-words max-w-[24mm]">${item.description}</td>
                        <td class="py-1 text-center font-medium">${item.quantity}</td>
                        <td class="py-1 text-right font-bold">${inv.currency || 'RD$'} ${(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                <!-- Totals -->
                <div class="border-t border-dashed border-zinc-300 pt-2 space-y-1 text-[8px] leading-none">
                  <div class="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${inv.currency || 'RD$'} ${inv.subtotal.toLocaleString()}</span>
                  </div>
                  ${inv.taxAmount > 0 ? `
                    <div class="flex justify-between">
                      <span>ITBIS (${inv.taxRate}%):</span>
                      <span>${inv.currency || 'RD$'} ${inv.taxAmount.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  ${inv.discount > 0 ? `
                    <div class="flex justify-between text-zinc-550">
                      <span>Descuento:</span>
                      <span>-${inv.currency || 'RD$'} ${inv.discount.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between font-black text-[9.5px] pt-1.5 border-t border-zinc-200 text-zinc-900">
                    <span>TOTAL:</span>
                    <span>${inv.currency || 'RD$'} ${inv.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <!-- Footer barcode lookalike or friendly note -->
                <div class="text-center mt-3 pt-2 border-t border-dashed border-zinc-300">
                  <p class="text-[7px] text-zinc-400 font-bold uppercase tracking-wider">¡Gracias por preferirnos!</p>
                  <p class="text-[6.5px] text-zinc-400 mt-0.5">Visite: ${inv.issuerEmail || 'soporte@system.com'}</p>
                </div>
              </div>

              <!-- Print panel helper for non-automatic environments -->
              <div class="mt-4 flex flex-col gap-1.5 no-print p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                <span class="text-[7.5px] text-zinc-500">¿No se abrió la ventana de impresión?</span>
                <div class="flex gap-1 justify-center">
                  <button onclick="window.print()" class="px-2 py-1 bg-zinc-900 text-white rounded text-[8px] font-bold">Imprimir</button>
                  <button onclick="window.close()" class="px-2 py-1 bg-zinc-250 text-zinc-700 rounded text-[8px] font-bold">Cerrar</button>
                </div>
              </div>

              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        pWin.document.close();
      } else {
        window.print();
      }
    } catch (error) {
      console.warn("Popup blocked, fallback printed:", error);
      window.print();
    }
  };

  const handlePrintCurrentBotoneraTicket = () => {
    if (!clientName) {
      alert('Por favor ingrese el nombre del cliente antes de progresar e imprimir.');
      return;
    }
    const currentInvoiceData: SavedInvoice = {
      id: 'temp',
      invoiceNumber,
      clientName,
      clientRnc,
      clientEmail: '',
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      currency,
      status: 'paid',
      items: items.map(it => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        price: it.price
      })),
      taxRate,
      discount,
      issuerName,
      issuerRnc,
      issuerAddress,
      issuerPhone,
      issuerEmail,
      issuerLogo,
      subtotal,
      taxAmount,
      grandTotal
    };
    handlePrintBotoneraTicket(currentInvoiceData);
  };

  const handleOpenPdfInvoice = async (inv: SavedInvoice, method: 'open' | 'share') => {
    const element = document.getElementById('history-invoice-capture-card');
    if (!element) return;

    setIsCapturingHistory(true);
    setHistoryShareMessage(null);
    try {
      const canvas = await safeHtml2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3, // Capture en ultra alta definición
        useCORS: true,
        logging: false
      });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = 140; // Mayor anchura para formato más grande y nítido
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      if (method === 'open') {
        const pdfWindow = window.open(blobUrl, '_blank');
        if (!pdfWindow) {
          setHistoryShareMessage("⚠️ Su navegador bloqueó la ventana emergente. Por favor, permita las ventanas emergentes o intente de nuevo.");
        } else {
          setHistoryShareMessage("¡Factura PDF abierta en una pestaña nueva sin descargar!");
        }
      } else {
        const file = new File([pdfBlob], `Factura_${inv.invoiceNumber}.pdf`, { type: 'application/pdf' });
        
        // Intentar compartir de forma nativa
        if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Factura ${inv.invoiceNumber}`,
              text: `Hola, le comparto la factura No. ${inv.invoiceNumber} en formato PDF.`
            });
            setHistoryShareMessage("¡Factura PDF compartida exitosamente por WhatsApp/Compartir nativo!");
            return;
          } catch (shareErr) {
            console.warn("Compartido nativo cancelado o no soportado:", shareErr);
          }
        }

        // WhatsApp Web/Link Fallback
        const textMsg = `*Factura Digital PDF:* Hola, le comparto la factura No. ${inv.invoiceNumber} por un total de ${inv.currency || 'RD$'} ${inv.grandTotal.toLocaleString()}. *(El archivo PDF está abierto en su visor de PDF, puede copiarlo o compartirlo desde allí)*`;
        const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`;
        window.open(shareUrl, '_blank');
        window.open(blobUrl, '_blank');
        setHistoryShareMessage("Se abrió el visor PDF y la ventana de WhatsApp para adjuntar o copiar el documento.");
      }

    } catch (err) {
      console.error("Error al generar PDF de factura:", err);
      alert("No se pudo procesar la factura en formato PDF.");
    } finally {
      setIsCapturingHistory(false);
    }
  };

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
      issuerLogo,
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
            title="Imprimir Factura estándar"
          >
            <Printer className="w-4 h-4" />
            Imprimir Factura
          </button>

          <button 
            id="btn-print-botonera-main"
            onClick={handlePrintCurrentBotoneraTicket}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md h-10 border border-zinc-800"
            title="Imprimir en Botonera (55mm - 58mm / tique térmico)"
          >
            <svg className="w-4 h-4 text-emerald-400 fill-none stroke-current stroke-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir en Botonera
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
            
            <div className="flex flex-col md:flex-row gap-5 items-start">
              {/* Columna Logo Redondo */}
              <div className="flex flex-col items-center gap-1.5 shrink-0 w-full md:w-auto text-center">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">Logo Empresa</label>
                <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-zinc-300 hover:border-red-650 bg-zinc-50/50 flex flex-col items-center justify-center overflow-hidden transition-all group shadow-sm">
                  {issuerLogo ? (
                    <>
                      <img src={issuerLogo} alt="Logo" className="w-full h-full object-cover animate-fade-in" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all shadow-md"
                          title="Eliminar Logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <label className="p-1.5 bg-zinc-650 hover:bg-zinc-750 text-white rounded-full transition-all shadow-md cursor-pointer" title="Cambiar Logo">
                          <Upload className="w-3.5 h-3.5" />
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100/50 transition-all p-2 text-center text-zinc-400 group">
                      <Upload className="w-5 h-5 mb-1.5 text-zinc-400 group-hover:text-red-800 transition-colors" />
                      <span className="text-[8px] font-extrabold uppercase leading-tight select-none">Elegir Foto</span>
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Columna Campos de Texto */}
              <div className="flex-1 space-y-3 w-full">
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
                <div className="flex items-center gap-3">
                  {issuerLogo ? (
                    <img 
                      src={issuerLogo} 
                      alt="Logo" 
                      className="w-12 h-12 rounded-full object-cover border border-zinc-200 shadow-xs shrink-0" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-black text-sm uppercase shrink-0">
                      {issuerName ? issuerName.trim().split(' ').map(n => n[0]).join('').substring(0, 2) : 'N'}
                    </div>
                  )}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setWhatsAppModalInvoice(inv);
                            setHistoryShareMessage(null);
                          }}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center ml-2"
                          title="Compartir Imagen por WhatsApp"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.012 3c-4.965 0-9.01 4.05-9.01 9.01 0 1.583.411 3.125 1.196 4.49l-1.196 4.5 4.603-1.21A8.93 8.93 0 0 0 12.011 21c4.966 0 9.01-4.048 9.01-9.009S16.977 3 12.012 3zm4.992 12.871c-.206.581-1.014 1.135-1.564 1.205-.5.06-1.149.079-1.85-.152-.619-.203-1.5-.544-2.541-1.002-4.414-1.942-7.237-6.526-7.457-6.824-.22-.298-1.782-2.396-1.782-4.572s1.114-3.243 1.513-3.69c.399-.446.879-.558 1.171-.558.292 0 .584.004.839.015.267.012.623-.105.973.743.361.874 1.233 3.033 1.338 3.256.106.223.176.48.028.773-.148.296-.223.479-.444.739-.22.259-.464.577-.662.775-.22.22-.453.46-.195.903.257.442.1.848 1.201 1.838 1.417 1.266 2.613 1.657 2.978 1.838.365.181.579.152.793-.1s.924-1.082 1.174-1.455c.249-.373.499-.311.839-.185.341.127 2.162 1.026 2.536 1.212.373.187.623.277.712.433.09.155.09.897-.116 1.478z"/>
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedInvoice(inv.id, e)}
                          className="p-1.5 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* WhatsApp Invoice Image Modal for histories */}
      {whatsAppModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs select-none no-print">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-md w-full p-6 space-y-5 shadow-2xl relative text-center max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Ingresar a Factura PDF</h4>
              <button 
                type="button" 
                onClick={() => setWhatsAppModalInvoice(null)} 
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors font-black text-base"
              >
                &times;
              </button>
            </div>

            <p className="text-[10px] text-zinc-500 leading-normal">
              A continuación tienes una vista previa. Puedes **ingresar a la factura PDF** para verla en pantalla completa o compartirla en WhatsApp sin descargas previas.
            </p>

            {/* Este es el contenedor que se convertirá en imagen con html2canvas y luego insertado en PDF */}
            <div 
              id="history-invoice-capture-card" 
              className="bg-white border border-zinc-200 p-6 rounded-2xl text-left text-xs space-y-3 shadow-xs select-text text-zinc-900 mx-auto max-w-[400px] w-full block"
            >
              <div className="text-center border-b border-dashed border-zinc-200 pb-3 mb-3 flex flex-col items-center">
                {(whatsAppModalInvoice.issuerLogo || issuerLogo) && (
                  <img 
                    src={whatsAppModalInvoice.issuerLogo || issuerLogo} 
                    alt="Logo" 
                    className="w-12 h-12 rounded-full object-cover mb-2 border border-zinc-150 shadow-xs shrink-0" 
                  />
                )}
                <h5 className="font-extrabold text-[13px] tracking-tight uppercase text-zinc-900">
                  {whatsAppModalInvoice.issuerName || 'Financiera Nova'}
                </h5>
                <p className="text-[10px] text-zinc-500">{whatsAppModalInvoice.issuerAddress || 'Santo Domingo, RD'}</p>
                <p className="text-[9px] text-zinc-400 font-bold">RNC: {whatsAppModalInvoice.issuerRnc || '1-01-88432-1'}</p>
                <div className="mt-2 inline-block bg-zinc-100 px-2.5 py-1 rounded-md text-[10px] font-mono text-zinc-700 font-bold">
                  {whatsAppModalInvoice.invoiceNumber}
                </div>
              </div>

              <div className="text-[11px] space-y-1 text-zinc-600 border-b border-zinc-100 pb-2">
                <p><strong>Cliente:</strong> {whatsAppModalInvoice.clientName}</p>
                {whatsAppModalInvoice.clientRnc && <p><strong>RNC:</strong> {whatsAppModalInvoice.clientRnc}</p>}
                <p><strong>Fecha:</strong> {whatsAppModalInvoice.issueDate || new Date().toLocaleDateString()}</p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-zinc-400 font-bold text-[9px] uppercase border-b border-zinc-100 pb-1">
                  <span>Concepto</span>
                  <span>Total</span>
                </div>
                {whatsAppModalInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px] py-1.5 border-b border-zinc-100 overflow-visible">
                    <div className="font-semibold text-zinc-800 leading-relaxed pb-1.5 pr-2 break-all md:break-words whitespace-normal max-w-[240px] overflow-visible">
                      {item.quantity}x {item.description}
                    </div>
                    <span className="font-mono text-zinc-900 font-bold shrink-0 pt-0.5">
                      {whatsAppModalInvoice.currency || 'RD$'} {(item.quantity * item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-zinc-200 pt-2.5 mt-2 space-y-1">
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>Subtotal:</span>
                  <span>{whatsAppModalInvoice.currency || 'RD$'} {whatsAppModalInvoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>ITBIS ({whatsAppModalInvoice.taxRate}%):</span>
                  <span>{whatsAppModalInvoice.currency || 'RD$'} {whatsAppModalInvoice.taxAmount.toLocaleString()}</span>
                </div>
                {whatsAppModalInvoice.discount > 0 && (
                  <div className="flex justify-between text-zinc-500 text-[11px]">
                    <span>Descuento:</span>
                    <span>-{whatsAppModalInvoice.currency || 'RD$'} {whatsAppModalInvoice.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-red-850 pt-2 border-t border-zinc-100 text-xs">
                  <span>TOTAL NETO:</span>
                  <span className="font-mono font-black">{whatsAppModalInvoice.currency || 'RD$'} {whatsAppModalInvoice.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-zinc-200">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">¡Gracias por su preferencia!</p>
                <p className="text-[8px] text-zinc-400 mt-1">Soporte: {whatsAppModalInvoice.issuerPhone || whatsAppModalInvoice.issuerEmail}</p>
              </div>
            </div>

            {historyShareMessage && (
              <div className="bg-emerald-50 text-emerald-850 text-[11px] font-bold p-3 rounded-xl border border-emerald-150 py-2">
                💬 {historyShareMessage}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isCapturingHistory}
                onClick={() => handleOpenPdfInvoice(whatsAppModalInvoice, 'open')}
                className="w-full py-2.5 bg-red-650 hover:bg-red-700 disabled:bg-zinc-350 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isCapturingHistory ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4 text-white fill-none stroke-current stroke-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
                {isCapturingHistory ? "Generando Factura..." : "Ingresar a Factura en PDF 📄"}
              </button>

              <button
                type="button"
                disabled={isCapturingHistory}
                onClick={() => handleOpenPdfInvoice(whatsAppModalInvoice, 'share')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-350 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm text-center"
              >
                <svg className="w-4 h-4 text-white fill-none stroke-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l4.632-2.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316l-4.632-2.316m0 0a3 3 0 10-5.367-2.684 3 3 0 005.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartir por WhatsApp (Sin Descarga) 💬
              </button>

              <button
                type="button"
                onClick={() => handlePrintBotoneraTicket(whatsAppModalInvoice)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm text-center"
              >
                <svg className="w-4 h-4 text-emerald-400 fill-none stroke-current stroke-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir en Botonera (55mm - 58mm) 🖨️
              </button>

              <button
                type="button"
                onClick={() => setWhatsAppModalInvoice(null)}
                className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-850 rounded-xl text-xs font-black transition-all"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
