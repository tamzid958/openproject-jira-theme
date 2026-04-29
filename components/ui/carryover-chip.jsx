"use client";

import { Icon } from "@/components/icons";

// Visual indicator for a work package that's currently in an open/locked
// sprint and was previously a member of one or more closed sprints. Reads
// "↻ ×N" with a tooltip listing the prior sprint names. Intentionally
// minimal so it slots into both backlog rows and board cards without
// disturbing existing density.
export function CarryOverChip({ entry }) {
  if (!entry || !entry.count) return null;
  const names = Array.isArray(entry.sprintNames) ? entry.sprintNames : [];
  const tooltip = names.length
    ? `Carried over from: ${names.join(", ")}`
    : `Carried over from ${entry.count} prior sprint${entry.count === 1 ? "" : "s"}`;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 h-4 rounded-full text-[10px] font-bold uppercase tracking-wider bg-status-blocked-bg text-status-blocked-fg shrink-0 cursor-help"
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon name="rotate-ccw" size={10} aria-hidden="true" />
      <span className="tabular-nums">×{entry.count}</span>
    </span>
  );
}

export default CarryOverChip;
