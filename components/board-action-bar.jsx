"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Menu } from "@/components/ui/menu";

// Sticky bottom action bar shown when the board has cards selected. Each
// button opens a Menu of choices for that field; picking one fires the
// supplied callback against every selected id, the parent fans the call
// out across the existing useUpdateTask / useDeleteTask mutations.
export function BoardActionBar({
  count,
  onClear,
  onSetStatus,
  onSetAssignee,
  onSetSprint,
  onSetType,
  onAddLabel,
  onDelete,
  statuses = [],
  assignees = [],
  sprints = [],
  types = [],
  categories = [],
}) {
  const [menu, setMenu] = useState(null);
  const open = (kind, e) =>
    setMenu({ kind, rect: e.currentTarget.getBoundingClientRect() });
  const close = () => setMenu(null);

  if (count <= 0) return null;

  const buttons = [
    { kind: "status", icon: "check", label: "Status" },
    { kind: "assignee", icon: "people", label: "Assign" },
    { kind: "sprint", icon: "sprint", label: "Sprint" },
    { kind: "type", icon: "epic", label: "Type" },
    { kind: "label", icon: "tag", label: "Label" },
  ];

  return (
    <>
      <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-elevated shadow-xl animate-pop">
        <span className="inline-flex items-center gap-1.5 pr-2 mr-1 border-r border-border-soft text-[12px] font-medium text-fg">
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent-50 text-accent-700 text-[11px] font-semibold tabular-nums">
            {count}
          </span>
          selected
        </span>
        {buttons.map((b) => (
          <button
            key={b.kind}
            type="button"
            onClick={(e) => open(b.kind, e)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium text-fg-muted hover:bg-surface-subtle hover:text-fg cursor-pointer"
            title={`Set ${b.label.toLowerCase()} for selected`}
          >
            <Icon name={b.icon} size={13} aria-hidden="true" />
            {b.label}
          </button>
        ))}
        <div className="w-px h-5 bg-border-soft mx-0.5" />
        <button
          type="button"
          onClick={(e) => open("delete", e)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium text-fg-muted hover:bg-status-blocked-bg hover:text-pri-highest cursor-pointer"
          title="Delete selected"
        >
          <Icon name="trash" size={13} aria-hidden="true" />
          Delete
        </button>
        <div className="w-px h-5 bg-border-soft mx-0.5" />
        <button
          type="button"
          onClick={onClear}
          className="grid place-items-center w-7 h-7 rounded-md text-fg-subtle hover:bg-surface-subtle hover:text-fg cursor-pointer"
          aria-label="Clear selection"
          title="Clear selection (Esc)"
        >
          <Icon name="x" size={13} aria-hidden="true" />
        </button>
      </div>

      {menu?.kind === "status" && (
        <Menu
          anchorRect={menu.rect}
          align="right"
          width={220}
          onClose={close}
          onSelect={(it) => onSetStatus?.(it.value, it.label)}
          items={statuses.map((s) => ({
            label: s.name,
            value: String(s.id),
            icon: s.isClosed ? "check" : "refresh",
          }))}
        />
      )}
      {menu?.kind === "assignee" && (
        <Menu
          anchorRect={menu.rect}
          align="right"
          width={240}
          searchable
          searchPlaceholder="Search people…"
          onClose={close}
          onSelect={(it) => onSetAssignee?.(it.value, it.label)}
          items={[
            { label: "Unassigned", value: null, icon: "people" },
            { divider: true },
            ...assignees.map((p) => ({
              label: p.name,
              value: p.id,
              avatar: p,
            })),
          ]}
        />
      )}
      {menu?.kind === "sprint" && (
        <Menu
          anchorRect={menu.rect}
          align="right"
          width={240}
          onClose={close}
          onSelect={(it) => onSetSprint?.(it.value, it.label)}
          items={[
            { label: "Move to backlog", value: null, icon: "sprint" },
            { divider: true },
            ...sprints
              .filter((s) => s.status !== "closed")
              .map((s) => ({
                label: s.name?.split(" — ")[0] || s.name,
                value: s.id,
                icon: "sprint",
              })),
          ]}
        />
      )}
      {menu?.kind === "type" && (
        <Menu
          anchorRect={menu.rect}
          align="right"
          width={200}
          onClose={close}
          onSelect={(it) => onSetType?.(it.value, it.label)}
          items={types.map((t) => ({
            label: t.name,
            value: t.id,
            icon: "epic",
          }))}
        />
      )}
      {menu?.kind === "label" && (
        <Menu
          anchorRect={menu.rect}
          align="right"
          width={220}
          onClose={close}
          onSelect={(it) => onAddLabel?.(it.value, it.label)}
          items={
            categories.length > 0
              ? categories.map((c) => ({
                  label: c.name,
                  value: c.name,
                  icon: "tag",
                }))
              : [{ label: "(no tags in this project)", value: null, disabled: true }]
          }
        />
      )}
      {menu?.kind === "delete" && (
        <Menu
          anchorRect={menu.rect}
          align="right"
          width={220}
          onClose={close}
          onSelect={(it) => it.value === "confirm" && onDelete?.()}
          items={[
            {
              label: `Delete ${count} issue${count === 1 ? "" : "s"}?`,
              value: null,
              disabled: true,
            },
            { divider: true },
            { label: "Yes, delete", value: "confirm", icon: "trash", danger: true },
          ]}
        />
      )}
    </>
  );
}
