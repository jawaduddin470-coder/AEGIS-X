import React, { useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  title: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info size={16} className="text-[#5DADE2]" />;
        let borderClass = 'border-l-4 border-l-[#5DADE2] border-[#E6EEF5]';
        let bg = 'bg-white/95 backdrop-blur-md';
        
        if (toast.type === 'warning') {
          icon = <AlertTriangle size={16} className="text-[#F4A261]" />;
          borderClass = 'border-l-4 border-l-[#F4A261] border-[#E6EEF5]';
        } else if (toast.type === 'critical') {
          icon = <ShieldAlert size={16} className="text-danger" />;
          borderClass = 'border-l-4 border-l-danger border-danger/20';
          bg = 'bg-[#FFF5F5]/95 backdrop-blur-md';
        } else if (toast.type === 'success') {
          icon = <CheckCircle2 size={16} className="text-success" />;
          borderClass = 'border-l-4 border-l-success border-[#E6EEF5]';
        }

        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            icon={icon}
            borderClass={borderClass}
            bg={bg}
            onRemove={onRemove}
          />
        );
      })}
    </div>
  );
};

const ToastItem: React.FC<{
  toast: Toast;
  icon: React.ReactNode;
  borderClass: string;
  bg: string;
  onRemove: (id: string) => void;
}> = ({ toast, icon, borderClass, bg, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`pointer-events-auto flex gap-3 p-4 rounded-xl shadow-glass-md border ${borderClass} ${bg} transition-all duration-300 hover:scale-[1.02]`}
      style={{
        animation: 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <h4 className="text-xs font-black text-[#1E3A5F]">{toast.title}</h4>
        <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-[#94A3B8] hover:text-[#1F2937] self-start transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};
