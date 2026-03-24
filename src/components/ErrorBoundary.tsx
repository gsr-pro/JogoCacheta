import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl w-full bg-stone-800/80 backdrop-blur-md p-8 rounded-3xl border border-red-500/30 shadow-2xl flex flex-col items-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Ops! A mesa virou.</h1>
            <p className="text-white/60 mb-6">Encontramos um erro inesperado ao renderizar esta tela.</p>
            
            <div className="w-full bg-black/50 p-4 rounded-xl text-left border border-white/5 mb-8 overflow-auto max-h-64">
              <p className="text-red-400 font-mono text-sm font-bold mb-2">
                {this.state.error?.toString()}
              </p>
              <pre className="text-stone-400 font-mono text-xs whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-stone-700 text-white font-bold rounded-xl hover:bg-stone-600 transition-colors"
              >
                Voltar para o Boteco
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" /> Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
