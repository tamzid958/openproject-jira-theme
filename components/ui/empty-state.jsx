"use client";

import { Inbox } from "lucide-react";

export function EmptyState({ icon: Icon = Inbox, title, body, action = null }) {
  return (
    <div
      role="status"
      className="grid justify-items-center gap-2 px-6 py-10 text-center text-fg-muted max-w-105 mx-auto"
    >
      <div
        className="grid place-items-center w-12 h-12 rounded-xl bg-surface-subtle text-fg-subtle mb-1"
        aria-hidden="true"
      >
        <Icon size={28} strokeWidth={1.5} />
      </div>
      {title ? (
        <div className="font-display text-base font-semibold text-fg">{title}</div>
      ) : null}
      {body ? (
        <div className="text-[13px] text-fg-subtle leading-relaxed">{body}</div>
      ) : null}
      {action ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 mt-2 h-8 px-3 rounded-md border border-accent bg-accent text-white text-[13px] font-semibold hover:bg-accent-600 hover:border-accent-600 disabled:opacity-50"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export default EmptyState;
