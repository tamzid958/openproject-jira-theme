"use client";

import { cn } from "@/lib/utils";

// Tag colours map to the six --tag-* tokens defined in globals.css. We pick
// a slot deterministically from the tag name so the same category always
// renders with the same colour, with a few keyword shortcuts for common
// names so "Bug" looks like a bug and "Frontend" looks like frontend.
const TAG_PALETTE = [
  "bg-tag-bug-bg text-tag-bug-fg",
  "bg-tag-frontend-bg text-tag-frontend-fg",
  "bg-tag-backend-bg text-tag-backend-fg",
  "bg-tag-design-bg text-tag-design-fg",
  "bg-tag-test-bg text-tag-test-fg",
  "bg-tag-docs-bg text-tag-docs-fg",
];

const KEYWORD_SLOT = {
  bug: 0, defect: 0, regression: 0, blocker: 0,
  frontend: 1, ui: 1, web: 1, ux: 1, client: 1,
  backend: 2, api: 2, server: 2, infra: 2, devops: 2, db: 2, database: 2,
  design: 3, research: 3, brand: 3, product: 3,
  test: 4, qa: 4, testing: 4, e2e: 4,
  docs: 5, documentation: 5, copy: 5, content: 5,
};

function hashSlot(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % TAG_PALETTE.length;
}

export function tagClass(name) {
  if (!name) return TAG_PALETTE[0];
  const k = String(name).trim().toLowerCase();
  const slot = KEYWORD_SLOT[k] ?? hashSlot(k);
  return TAG_PALETTE[slot];
}

export function TagPill({ name, size = "sm", className }) {
  if (!name) return null;
  const sizeCls =
    size === "xs"
      ? "h-5 px-1.5 text-[10px]"
      : "h-5.5 px-2 text-[11px]";
  return (
    <span
      title={name}
      className={cn(
        "inline-flex items-center rounded font-semibold uppercase tracking-wider whitespace-nowrap max-w-32 truncate",
        sizeCls,
        tagClass(name),
        className,
      )}
    >
      {name}
    </span>
  );
}
