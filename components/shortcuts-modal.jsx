"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons";

const SHORTCUTS = [
  { keys: ["⌘", "K"], desc: "Open command palette" },
  { keys: ["c"], desc: "Create issue" },
  { keys: ["b"], desc: "Go to board" },
  { keys: ["g", "b"], desc: "Go to backlog" },
  { keys: ["g", "d"], desc: "Go to overview" },
  { keys: ["g", "h"], desc: "Go to hierarchy" },
  { keys: ["g", "r"], desc: "Go to reports" },
  { keys: ["Esc"], desc: "Close modal / dropdown" },
];

export function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center p-3 sm:p-6 scrim animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface-elevated rounded-xl shadow-xl w-full max-w-md p-4 sm:p-6 animate-slide-up"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[20px] font-semibold tracking-[-0.018em] text-fg m-0">Keyboard shortcuts</h2>
          <button
            type="button"
            className="grid place-items-center w-8 h-8 rounded-md text-fg-subtle hover:bg-surface-subtle hover:text-fg"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-1.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.desc}
              className="flex items-center justify-between py-1.5 border-b border-border-soft last:border-b-0 text-[13px]"
            >
              <span className="text-fg-muted">{s.desc}</span>
              <span className="inline-flex gap-1">
                {s.keys.map((k, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded border border-border bg-surface-app text-[11px] font-mono text-fg-muted"
                  >
                    {k}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
