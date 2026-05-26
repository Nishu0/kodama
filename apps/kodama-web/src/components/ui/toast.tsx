"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "error";

type ToastInput = { title: string; description?: string; variant?: Variant };
type ToastItem = ToastInput & { id: number; variant: Variant };

const ToastContext = React.createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const TIMEOUT_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = (idRef.current += 1);
      setItems((prev) => [...prev, { variant: "default", ...input, id }]);
      window.setTimeout(() => remove(id), TIMEOUT_MS);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(92vw,380px)] flex-col gap-2">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border bg-card/95 p-3.5 shadow-lg backdrop-blur",
        item.variant === "success" && "border-emerald-500/30",
        item.variant === "error" && "border-destructive/30",
        item.variant === "default" && "border-border",
      )}
    >
      <span
        className={cn(
          "mt-1.5 inline-block h-2 w-2 flex-none rounded-full",
          item.variant === "success" && "bg-emerald-500",
          item.variant === "error" && "bg-destructive",
          item.variant === "default" && "bg-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
