"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function ConfirmModal({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
  children,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center p-3 sm:p-6 scrim animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface-elevated rounded-xl shadow-xl w-full max-w-md p-4 sm:p-6 animate-slide-up"
      >
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.018em] text-fg m-0 mb-2">{title}</h2>
        {description && (
          <p className="text-[13px] text-fg-subtle leading-relaxed m-0 mb-4">{description}</p>
        )}
        {children}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-elevated text-fg text-[13px] font-medium hover:bg-surface-subtle hover:border-border-strong disabled:opacity-50"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-white text-[13px] font-medium border disabled:opacity-50",
              destructive
                ? "bg-pri-highest border-pri-highest hover:opacity-90"
                : "bg-accent border-accent hover:bg-accent-600 hover:border-accent-600",
            )}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
