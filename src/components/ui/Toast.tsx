"use client";

import React, { useState, useCallback, createContext, useContext } from "react";

type ToastType = "success" | "warning" | "danger" | "info" | "error" | "";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const typeColors: Record<ToastType, string> = {
  success: "#15803d",
  warning: "#b45309",
  danger: "#b91c1c",
  info: "#3b82f6",
  error: "#b91c1c",
  "": "#1f2937",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let nextId = React.useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 900 }} aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: typeColors[toast.type],
              color: "#fff",
              padding: "12px 20px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 500,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              marginBottom: "8px",
              maxWidth: "90vw",
              animation: "fadeSlideIn 300ms ease",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
