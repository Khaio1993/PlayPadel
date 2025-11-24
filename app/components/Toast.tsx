"use client";

import { useEffect, useState } from "react";
import { Check, AlertTriangle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border p-4 shadow-lg transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toast.type === "success"
              ? "border-primary/20 bg-primary/10 text-primary"
              : toast.type === "error"
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : toast.type === "warning"
              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
              : "border-border bg-card text-foreground"
          }`}
        >
          {toast.type === "success" && <Check className="h-5 w-5 shrink-0" />}
          {toast.type === "error" && <AlertTriangle className="h-5 w-5 shrink-0" />}
          {toast.type === "warning" && <AlertTriangle className="h-5 w-5 shrink-0" />}
          {toast.type === "info" && <Info className="h-5 w-5 shrink-0" />}
          
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 rounded-full p-1 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}

