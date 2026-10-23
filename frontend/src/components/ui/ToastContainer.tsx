import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

const ICONS = {
  success: <CheckCircle size={20} color="var(--cx-success)" />,
  error: <XCircle size={20} color="var(--cx-error)" />,
  warning: <AlertTriangle size={20} color="var(--cx-warning)" />,
  info: <Info size={20} color="var(--cx-info)" />,
};

export default function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {ICONS[toast.type]}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{toast.title}</div>
            {toast.message && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', marginTop: '0.125rem' }}>
                {typeof toast.message === 'string'
                  ? toast.message
                  : Array.isArray(toast.message)
                  ? (toast.message as any[]).map((m) => (typeof m === 'object' && m ? m.msg || m.message || JSON.stringify(m) : String(m))).join(', ')
                  : typeof toast.message === 'object'
                  ? (toast.message as any).msg || (toast.message as any).message || JSON.stringify(toast.message)
                  : String(toast.message)}
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => onDismiss(toast.id)}
            style={{ flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
