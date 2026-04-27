"use client";

import { Inbox } from "lucide-react";
import { DisplayHeading } from "@/components/ui/display-heading";

// Empty state — used wherever a list / view has nothing to show. The
// title borrows the Fraunces serif from the hero language so the empty
// surface itself feels intentional rather than "missing data".
export function EmptyState({ icon: Icon = Inbox, title, body, action = null }) {
  return (
    <div
      role="status"
      className="grid justify-items-center gap-3 px-6 py-14 text-center text-fg-muted max-w-md mx-auto"
    >
      <div
        className="grid place-items-center w-12 h-12 rounded-full border border-border-soft text-fg-subtle mb-2"
        aria-hidden="true"
      >
        <Icon size={20} strokeWidth={1.5} />
      </div>
      {title ? (
        <DisplayHeading as="h3" size="sm" italic className="text-fg">
          {title}
        </DisplayHeading>
      ) : null}
      {body ? (
        <div className="text-[13.5px] text-fg-subtle leading-relaxed max-w-sm">
          {body}
        </div>
      ) : null}
      {action ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 mt-3 h-9 px-4 rounded-md bg-accent text-accent-700 text-[13px] font-semibold transition-transform hover:-translate-y-px shadow-(--card-highlight) disabled:opacity-50 disabled:translate-y-0"
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
