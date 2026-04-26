"use client";

export function LoadingPill({ label = "loading" }) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 h-6 rounded-full bg-surface-muted text-fg-subtle text-[11px] font-medium">
      <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-border-strong border-t-accent animate-spin" />
      {label}…
    </span>
  );
}
