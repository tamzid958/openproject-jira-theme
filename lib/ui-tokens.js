// Shared UI primitives used across multiple components — single source so a
// visual tweak (e.g. height bump) propagates everywhere instead of drifting
// between filter chips, sprint actions, page headers, etc.

export const BTN_PILL_BASE =
  "inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md border text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const BTN_PILL_DEFAULT = `${BTN_PILL_BASE} bg-white border-border text-fg hover:bg-surface-subtle hover:border-border-strong`;

export const BTN_PILL_PRIMARY = `${BTN_PILL_BASE} bg-accent border-accent text-white hover:bg-accent-600 hover:border-accent-600`;

export const BTN_KEBAB =
  "grid place-items-center w-7 h-7 rounded-md border border-transparent text-fg-subtle hover:bg-surface-subtle hover:text-fg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
