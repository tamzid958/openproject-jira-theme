"use client";

import { useState } from "react";
import { Menu } from "@/components/ui/menu";

// Right-click / quick-edit context menu for a single card. Shows a list of
// fields the user can change without opening the detail modal; picking
// one drills into a sub-menu of choices for that field.
//
// Two-stage UX so the menus stay shallow:
//   1. root menu: "Open · Status · Assignee · Sprint · Type · Label · Delete"
//   2. clicking a field replaces the items with that field's choices,
//      anchored to the same point so it feels like an in-place drill.
export function BoardCardMenu({
  point,
  anchorRect: anchorRectProp,
  initialStage = "root",
  task,
  statuses = [],
  assignees = [],
  sprints = [],
  types = [],
  categories = [],
  onOpen,
  onSetStatus,
  onSetAssignee,
  onSetSprint,
  onSetType,
  onAddLabel,
  onDelete,
  onClose,
}) {
  const [stage, setStage] = useState(initialStage);
  if (!point && !anchorRectProp) return null;
  // Mouse right-click passes a `point`; keyboard shortcut passes a real
  // rect. Synthesize a tiny rect from the point so Menu's positioning
  // logic can clamp to the viewport identically in either case.
  const rect = anchorRectProp || {
    left: point.x,
    right: point.x,
    top: point.y,
    bottom: point.y,
    width: 0,
    height: 0,
  };

  const canUpdate = task?.permissions?.update !== false;
  const canDelete = task?.permissions?.delete !== false;

  const close = () => {
    setStage("root");
    onClose?.();
  };

  if (stage === "root") {
    return (
      <Menu
        anchorRect={rect}
        width={220}
        onClose={close}
        onSelect={(it) => {
          if (it.value === "__open") {
            onOpen?.();
            close();
            return;
          }
          if (it.value === "__delete") {
            onDelete?.();
            close();
            return;
          }
          // Field drill — re-render with that field's choices.
          setStage(it.value);
        }}
        items={[
          { label: "Open issue", value: "__open", icon: "eye" },
          { divider: true },
          {
            label: "Set status",
            value: "status",
            icon: "check",
            disabled: !canUpdate,
          },
          {
            label: "Assign",
            value: "assignee",
            icon: "people",
            disabled: !canUpdate,
          },
          {
            label: "Move to sprint",
            value: "sprint",
            icon: "sprint",
            disabled: !canUpdate,
          },
          {
            label: "Change type",
            value: "type",
            icon: "epic",
            disabled: !canUpdate,
          },
          {
            label: "Add label",
            value: "label",
            icon: "tag",
            disabled: !canUpdate,
          },
          { divider: true },
          {
            label: "Delete issue",
            value: "__delete",
            icon: "trash",
            danger: true,
            disabled: !canDelete,
          },
        ]}
      />
    );
  }

  if (stage === "status") {
    return (
      <Menu
        anchorRect={rect}
        width={220}
        onClose={close}
        onSelect={(it) => {
          onSetStatus?.(it.value, it.label);
          close();
        }}
        items={statuses.map((s) => ({
          label: s.name,
          value: String(s.id),
          icon: s.isClosed ? "check" : "refresh",
          active: String(s.id) === String(task?.statusId),
        }))}
      />
    );
  }

  if (stage === "assignee") {
    return (
      <Menu
        anchorRect={rect}
        width={240}
        searchable
        searchPlaceholder="Search people…"
        onClose={close}
        onSelect={(it) => {
          onSetAssignee?.(it.value, it.label);
          close();
        }}
        items={[
          {
            label: "Unassigned",
            value: null,
            icon: "people",
            active: !task?.assignee,
          },
          { divider: true },
          ...assignees.map((p) => ({
            label: p.name,
            value: p.id,
            avatar: p,
            active: String(p.id) === String(task?.assignee),
          })),
        ]}
      />
    );
  }

  if (stage === "sprint") {
    return (
      <Menu
        anchorRect={rect}
        width={240}
        onClose={close}
        onSelect={(it) => {
          onSetSprint?.(it.value, it.label);
          close();
        }}
        items={[
          {
            label: "Move to backlog",
            value: null,
            icon: "sprint",
            active: !task?.sprint,
          },
          { divider: true },
          ...sprints
            .filter((s) => s.status !== "closed")
            .map((s) => ({
              label: s.name?.split(" — ")[0] || s.name,
              value: s.id,
              icon: "sprint",
              active: String(s.id) === String(task?.sprint),
            })),
        ]}
      />
    );
  }

  if (stage === "type") {
    return (
      <Menu
        anchorRect={rect}
        width={200}
        onClose={close}
        onSelect={(it) => {
          onSetType?.(it.value, it.label);
          close();
        }}
        items={types.map((t) => ({
          label: t.name,
          value: t.id,
          icon: "epic",
          active: String(t.id) === String(task?.typeId),
        }))}
      />
    );
  }

  if (stage === "label") {
    const existing = new Set(task?.labels || []);
    return (
      <Menu
        anchorRect={rect}
        width={220}
        onClose={close}
        onSelect={(it) => {
          if (it.value) onAddLabel?.(it.value);
          close();
        }}
        items={
          categories.length > 0
            ? categories.map((c) => ({
                label: c.name,
                value: c.name,
                icon: "tag",
                disabled: existing.has(c.name),
                active: existing.has(c.name),
              }))
            : [{ label: "(no tags in this project)", value: null, disabled: true }]
        }
      />
    );
  }

  return null;
}
