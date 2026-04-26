"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useOpenCounts } from "@/lib/hooks/use-openproject-detail";

export function AllProjectsModal({ projects, currentProjectId, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const counts = useOpenCounts();
  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.key.toLowerCase().includes(q.toLowerCase()),
  );

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center p-6 bg-[rgba(15,23,41,0.45)] backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[calc(100vh-48px)] animate-slide-up"
      >
        <header className="flex items-center px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg font-bold text-fg m-0">All projects</h2>
          <button
            type="button"
            className="ml-auto grid place-items-center w-8 h-8 rounded-md text-fg-subtle hover:bg-surface-subtle hover:text-fg"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size={14} aria-hidden="true" />
          </button>
        </header>
        <div className="px-4 py-2.5 border-b border-border-soft">
          <div className="relative">
            <Icon
              name="search"
              size={13}
              className="absolute left-2 top-2 text-fg-faint pointer-events-none"
              aria-hidden="true"
            />
            <input
              autoFocus
              placeholder="Search projects…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-white text-[13px] text-fg outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((p) => {
            const open = counts.data?.[p.id] ?? counts.data?.[p.identifier] ?? null;
            const active = p.id === currentProjectId;
            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelect(p.id);
                  onClose();
                }}
                className={[
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-md cursor-pointer transition-colors",
                  active ? "bg-accent-50" : "hover:bg-surface-subtle",
                ].join(" ")}
              >
                <span
                  className="px-1.5 py-0.5 rounded text-white font-mono text-[11px] font-bold shrink-0"
                  style={{ background: p.color }}
                >
                  {p.key}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-fg truncate">{p.name}</div>
                  <div className="text-xs text-fg-subtle truncate">
                    {p.desc || p.identifier} {open != null ? `· ${open} open` : ""}
                  </div>
                </div>
                {active && (
                  <Icon name="check" size={14} className="text-accent-700" aria-hidden="true" />
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-6 text-[13px] text-fg-subtle">No projects match.</div>
          )}
        </div>
      </div>
    </div>
  );
}
