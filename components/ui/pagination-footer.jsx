"use client";

// Reusable "Show N more / Show all / Show less" pagination footer. Used
// by long lists (backlog sections, reports panels) where the parent owns
// the visibleCount state and wants a consistent control row.
//
// Hidden when total <= pageSize. Renders only "Show less" when fully
// expanded; otherwise renders the count + "Show N more" + "Show all".

export function PaginationFooter({
  visible,
  total,
  pageSize,
  onShowMore,
  onShowAll,
  onShowLess,
  align = "between",
}) {
  if (total <= pageSize) return null;
  const expanded = visible >= total;
  if (expanded) {
    return (
      <div className="flex items-center justify-end gap-2 px-3 sm:px-5 py-2 border-t border-border-soft bg-surface-sunken">
        <button
          type="button"
          onClick={onShowLess}
          className="inline-flex items-center h-7 px-2.5 rounded-md text-[12px] font-medium text-fg-subtle hover:text-fg cursor-pointer"
        >
          Show less
        </button>
      </div>
    );
  }
  const next = Math.min(pageSize, total - visible);
  return (
    <div
      className={`flex items-center gap-2 px-3 sm:px-5 py-2 border-t border-border-soft bg-surface-sunken ${
        align === "end" ? "justify-end" : "justify-between"
      }`}
    >
      {align !== "end" && (
        <span className="text-[12px] text-fg-subtle">
          Showing {visible} of {total}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onShowMore}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-surface-elevated text-[12px] font-medium text-fg hover:bg-surface-subtle hover:border-border-strong cursor-pointer"
        >
          Show {next} more
        </button>
        <button
          type="button"
          onClick={onShowAll}
          className="inline-flex items-center h-7 px-2.5 rounded-md text-[12px] font-medium text-fg-subtle hover:text-fg cursor-pointer"
        >
          Show all
        </button>
      </div>
    </div>
  );
}

export default PaginationFooter;
