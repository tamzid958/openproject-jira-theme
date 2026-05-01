"use client";

const BUCKET_CLASS = {
  todo: "bg-status-todo-bg text-status-todo-fg",
  progress: "bg-status-progress-bg text-status-progress-fg",
  review: "bg-status-review-bg text-status-review-fg",
  done: "bg-status-done-bg text-status-done-fg",
  blocked: "bg-status-blocked-bg text-status-blocked-fg",
};

const BUCKET_LABEL = {
  todo: "To Do",
  progress: "In Progress",
  review: "In Review",
  done: "Done",
  blocked: "Blocked",
};

// `status` is the bucket (todo / progress / review / done / blocked) — used
// for the colour class. `name` is the real OpenProject status name when
// available, falling back to the static bucket label.
//
// The pill keeps its chrome (background + padding) regardless of how
// narrow its container becomes; only the inner label truncates so the
// status colour is always readable. Hover for the full text.
export function StatusPill({ status, name }) {
  if (!status && !name) return null;
  const cls = BUCKET_CLASS[status] || BUCKET_CLASS.todo;
  const label = name || BUCKET_LABEL[status] || status;
  return (
    <span
      title={label}
      className={`inline-flex items-center h-5.5 px-2 rounded text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap max-w-full ${cls}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
