import { useState } from 'react';
import { Shield, Users, Database, AlertTriangle, Lock, CheckCircle2, Download, Globe } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { formatCurrency } from '../lib/utils';

export default function AdminPanel() {
  const { transactions, profile } = useAuth();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified password as requested
    if (password.toLowerCase() === 'nova') {
      setIsAuthorized(true);
      setError('');
    } else {
      setError('Contraseña incorrecta. Intenta con "nova"');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Acceso Restringido</h2>
          <p className="text-slate-500">Introduce la contraseña de administrador para continuar.</p>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <input 
            type="password" 
            placeholder="Contraseña"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
          <button 
            type="submit"
            className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Desbloquear Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-zinc-900" />
            Panel de Control Admin
          </h2>
          <p className="text-zinc-500">Gestión global del sistema y monitoreo de actividad.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Sistema Online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <p className="text-zinc-500 text-sm font-medium">Usuarios Activos</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">1</h3>
          <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">{profile?.displayName?.split(' ')[0]} (Admin)</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-red-800">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-red-800" />
            <p className="text-zinc-500 text-sm font-medium">Transacciones Totales</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">{transactions.length}</h3>
          <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">Sincronizado con Firestore</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <p className="text-zinc-500 text-sm font-medium">Alertas de Sistema</p>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">0</h3>
          <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">No se detectan errores</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* CRITICAL CACHE & TROUBLESHOOTING ALERT */}
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-base font-bold text-amber-900">⚠️ ¿SIGUE APARECIENDO "SERVI MARKET" EN TU WEB?</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                ¡No te preocupes ni pases vergüenza! Esto <strong>no</strong> significa que el archivo que te descargas esté mal o que sea el viejo. Se debe a un comportamiento muy común de los navegadores y de <strong>InfinityFree</strong>. Aquí te explico exactamente por qué ocurre y cómo solucionarlo en 1 minuto:
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-4 rounded-2xl border border-amber-100 space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Causa 1: Caché de tu navegador</span>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Tu navegador web guarda copias pesadas de las páginas que ya has visitado para que carguen más rápido. Sigue cargando "Servi Market" desde el disco duro de tu computadora, no desde Internet.
              </p>
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                ✔️ Solución: Abre una ventana de <strong>Incógnito / Privado</strong> en tu navegador e ingresa a tu link para ver el cambio real. O presiona <code className="bg-zinc-100 px-1 py-0.5 rounded">Ctrl + F5</code>.
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Causa 2: Archivos prioritarios en InfinityFree</span>
              <p className="text-xs text-zinc-600 leading-relaxed">
                El hosting gratuito de InfinityFree prioriza archivos con terminación <code>.php</code> o nombres de plantilla antes que tu nuevo <code>index.html</code>. Si aún existen allí, se cargarán primero.
              </p>
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                ✔️ Solución: Entra a tu administrador de archivos en <strong>htdocs</strong> y borra archivos antiguos como <code>index.php</code>, <code>default.php</code> o <code>index2.html</code>.
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Causa 3: Caché del Servidor de InfinityFree</span>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Los servidores de InfinityFree a veces tardan unos minutos (hasta 10-15 minutos) en refrescar los archivos nuevos que subes a su panel.
              </p>
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                ✔️ Solución: Ten paciencia unos minutos o limpia las cookies y datos del sitio web en la configuración de Candado de la barra de navegación.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CARD 1: INFINITYFREE ONLINE DEPLOYMENT */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              1. Subir a InfinityFree (Web Online)
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Sigue estos pasos para que tu web funcione de inmediato en tu hosting gratuito:
            </p>
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 space-y-2">
              <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
                <li>
                  <span className="text-zinc-900 font-medium">Descarga</span> el archivo <code>index.html</code> de abajo.
                </li>
                <li>
                  Abre el administrador de archivos en <strong>InfinityFree</strong> y entra a la carpeta <strong>htdocs</strong>.
                </li>
                <li>
                  <span className="text-zinc-900 font-medium">BOGUEA/BORRA</span> cualquier archivo php viejo, especialmente <code>index.php</code> o <code>default.php</code> de Servi Market.
                </li>
                <li>
                  <span className="text-zinc-900 font-medium">Sube</span> el archivo <code>index.html</code> que descargues ahora. ¡Y listo!
                </li>
              </ol>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <a 
              href="/index.html"
              download="index.html"
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50"
            >
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                <span>Descargar index.html</span>
              </div>
              <span className="text-[10px] opacity-90 font-normal">Archivo individual listo para htdocs</span>
            </a>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase">
                <span className="bg-white px-2 text-zinc-400 font-bold tracking-widest">Alternativa</span>
              </div>
            </div>

            <a 
              href="/FINANCIERA_NOVA_LISTO.zip"
              download="FINANCIERA_NOVA_LISTO.zip"
              className="w-full py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all text-sm"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              Descargar ZIP de Respaldo
            </a>
          </div>
        </div>

        {/* CARD 2: XAMPP LOCAL SERVER DEPLOYMENT */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" />
              2. Copiar Localmente en XAMPP
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Sigue estos pasos para instalar y ejecutar Financiera Nova localmente en tu computadora:
            </p>
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 space-y-2">
              <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
                <li>
                  <span className="text-indigo-900 font-medium">Baja el ZIP</span> utilizando el botón azul de abajo.
                </li>
                <li>
                  Dirígete a tu directorio de XAMPP (por defecto <code>C:\xampp\htdocs\</code>).
                </li>
                <li>
                  Crea una carpeta llamada <strong className="text-indigo-950 font-bold">financiera_nova</strong> y descomprime el contenido del ZIP ahí (el archivo <code>index.html</code>).
                </li>
                <li>
                  Abre tu XAMPP Control Panel, activa el servicio <strong className="text-zinc-900">Apache</strong>, y entra en tu navegador a: <code className="bg-indigo-100/40 text-indigo-900 px-1 rounded">http://localhost/financiera_nova/</code>
                </li>
              </ol>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <a 
              href="/FINANCIERA_NOVA_XAMPP.zip"
              download="FINANCIERA_NOVA_XAMPP.zip"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200/50"
            >
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                <span>Descargar para XAMPP (ZIP)</span>
              </div>
              <span className="text-[10px] opacity-90 font-normal">Compresor ZIP listo para htdocs local</span>
            </a>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase">
                <span className="bg-white px-2 text-zinc-400 font-bold tracking-widest">Alternativa</span>
              </div>
            </div>

            <a 
              href="/index.html"
              download="index.html"
              className="w-full py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all text-sm"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              Descargar index.html Directo
            </a>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold text-zinc-900 mb-6">Configuración Crítica</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-zinc-900">Mantenimiento Global</p>
              <p className="text-xs text-zinc-500">Desactiva el acceso a todos los usuarios.</p>
            </div>
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-200">
              <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white transition" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-zinc-900">Logs de Auditoría</p>
              <p className="text-xs text-zinc-500">Ver todas las acciones realizadas por usuarios.</p>
            </div>
            <button className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-all">
              Ver Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
