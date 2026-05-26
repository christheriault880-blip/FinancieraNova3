import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  recoveryAttempts: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    recoveryAttempts: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, recoveryAttempts: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in boundary:', error, errorInfo);

    const errorMessage = error?.message || "";
    const isDOMMismatch = 
      errorMessage.includes('insertBefore') || 
      errorMessage.includes('removeChild') || 
      errorMessage.includes('Node') || 
      errorMessage.includes('NotFoundError') ||
      errorMessage.includes('child of this node');

    if (isDOMMismatch && this.state.recoveryAttempts < 3) {
      console.warn(`Real-time DOM desync detected (often caused by browser autotranslate or extensions). Attempting self-healing recovery (${this.state.recoveryAttempts + 1}/3)...`);
      
      setTimeout(() => {
        this.setState((prevState) => ({
          hasError: false,
          error: null,
          recoveryAttempts: prevState.recoveryAttempts + 1
        }));
      }, 150);
    }
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Algo salió mal. Por favor, intenta recargar la página.";
      
      try {
        // Check if it's a Firestore permission error (JSON string)
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("permission")) {
          errorMessage = "No tienes permisos suficientes para realizar esta acción. Verifica tu sesión.";
        }
      } catch (e) {
        // Not a JSON error, use default
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">¡Ups! Error inesperado</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              Recargar Aplicación
            </button>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-slate-100 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-[10px] font-mono text-slate-600 whitespace-pre-wrap">
                  {this.state.error?.stack}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
