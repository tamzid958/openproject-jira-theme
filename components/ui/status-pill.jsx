"use client";

import { STATUSES } from "@/lib/data";

const BUCKET_CLASS = {
  todo: "bg-status-todo-bg text-status-todo-fg",
  progress: "bg-status-progress-bg text-status-progress-fg",
  review: "bg-status-review-bg text-status-review-fg",
  done: "bg-status-done-bg text-status-done-fg",
  blocked: "bg-status-blocked-bg text-status-blocked-fg",
};

// `status` is the bucket (todo/progress/review/done) — used for the colour
// class. `name` is the real OpenProject status name when available (falls
// back to the static bucket label).
export function StatusPill({ status, name }) {
  const bucket = STATUSES.find((x) => x.id === status);
  if (!bucket && !name) return null;
  const colorKey = bucket?.color || status || "todo";
  const cls = BUCKET_CLASS[colorKey] || BUCKET_CLASS.todo;
  return (
    <span
      className={`inline-flex items-center h-5.5 px-2 rounded text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${cls}`}
    >
      {name || bucket?.name}
    </span>
  );
}
