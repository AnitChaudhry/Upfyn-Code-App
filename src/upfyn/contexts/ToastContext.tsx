import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  removing?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)));
    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs?: number) => {
      const id = ++idRef.current;
      // Error toasts last longer by default
      const duration = durationMs ?? (type === 'error' ? 8000 : 4000);
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // max 5 toasts
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

const ICONS: Record<ToastType, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

const COLORS: Record<ToastType, string> = {
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

const ICON_COLORS: Record<ToastType, string> = {
  info: 'text-blue-400',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none"
      aria-live="polite"
      role="status"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 border rounded-xl px-3.5 py-3 text-sm shadow-lg backdrop-blur-md transition-all duration-250 ${
              toast.removing
                ? 'opacity-0 translate-x-4'
                : 'animate-in slide-in-from-right duration-300'
            } ${COLORS[toast.type]}`}
            role="alert"
          >
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ICON_COLORS[toast.type]}`} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="flex-shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
