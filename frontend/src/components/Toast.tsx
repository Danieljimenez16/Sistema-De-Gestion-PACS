import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cls } from '../utils/helpers';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastProps[];
  addToast: (type: ToastProps['type'], message: string, duration?: number) => string;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (type: ToastProps['type'], message: string, duration = 4000) => {
    const id = Date.now().toString();
    const toast: ToastProps = { id, type, message, duration };
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};

const TOAST_STYLES = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-yellow-600 text-white',
};

const ToastContainer: React.FC<{
  toasts: ToastProps[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cls(
            'px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 pointer-events-auto animate-slide-up',
            TOAST_STYLES[toast.type]
          )}
        >
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-white hover:opacity-80 transition-opacity flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
