"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Menu } from "@/components/ui/menu";
import { BTN_PILL_DEFAULT, BTN_PILL_PRIMARY } from "@/lib/ui-tokens";

// Two-button cluster used in every Backlog section header (and the Board
// page header when an active sprint is selected). Replaces the older row
// of Start / Complete / Edit / Delete + kebab — those are still reachable,
// they're just collapsed behind the "Assign…" menu so the header reads as
// two clear primary actions instead of a six-icon strip.
//
// Buttons:
//   "+ Create sprint" — opens the create-sprint modal (always visible when
//                       the user can manage versions). Per-section "Create
//                       issue" lives inside the section body.
//   "Assign…"         — state-aware menu. Lists Start / Complete based on
//                       sprint.state, plus Edit and Delete. On the
//                       "Without sprint" section it lists "Move selected
//                       to a sprint…" if a selection exists, otherwise it
//                       renders nothing (only the Create button shows).
//
// Props:
//   sprint            — the sprint backing this section (`null` for the
//                       backlog-only section).
//   manageVersions    — { allowed, loading } from usePermissionWithLoading;
//                       buttons render disabled while loading and hidden
//                       when permission is denied.
//   onStart / onComplete / onEdit / onDelete / onCreate — wired modals.
//   variant           — "compact" hides the "+ Create sprint" button (used
//                       on Board page header where the page-title CTA is
//                       elsewhere). Default "full" shows both.
export function SprintActionsRow({
  sprint,
  manageVersions = { allowed: false, loading: false },
  onStart,
  onComplete,
  onCreate,
  onEdit,
  onDelete,
  variant = "full",
}) {
  const [menuRect, setMenuRect] = useState(null);
  const { allowed, loading } = manageVersions;

  if (!allowed && !loading) return null;
  const disabled = !allowed || loading;
  const hasSprint = !!sprint;

  // Assemble the menu items based on the sprint state. We always include
  // edit + delete when callbacks are provided so the section header has a
  // single discoverable place for sprint management.
  const items = [];
  if (hasSprint && sprint?.state === "planned" && onStart) {
    items.push({ label: "Start sprint", value: "start", icon: "play" });
  }
  if (hasSprint && sprint?.state === "active" && onComplete) {
    items.push({ label: "Complete sprint", value: "complete", icon: "check" });
  }
  if (hasSprint && onEdit) {
    items.push({ label: "Edit sprint", value: "edit", icon: "edit" });
  }
  if (hasSprint && onDelete) {
    if (items.length > 0) items.push({ divider: true });
    items.push({ label: "Delete sprint", value: "delete", icon: "trash", danger: true });
  }

  const showCreate = variant !== "compact" && onCreate;

  return (
    <>
      {showCreate && (
        <button
          type="button"
          className={BTN_PILL_DEFAULT}
          onClick={() => !disabled && onCreate()}
          disabled={disabled}
          title={loading ? "Checking permissions…" : "Create a new sprint"}
        >
          <Icon name="plus" size={12} aria-hidden="true" />
          Create sprint
        </button>
      )}
      {hasSprint && items.length > 0 && (
        <button
          type="button"
          className={BTN_PILL_PRIMARY}
          aria-haspopup="menu"
          disabled={disabled}
          onClick={(e) => !disabled && setMenuRect(e.currentTarget.getBoundingClientRect())}
          title={loading ? "Checking permissions…" : "Sprint actions"}
        >
          <Icon name="settings" size={12} aria-hidden="true" />
          Assign…
        </button>
      )}
      {menuRect && (
        <Menu
          anchorRect={menuRect}
          align="right"
          onClose={() => setMenuRect(null)}
          onSelect={(it) => {
            if (it.value === "edit") onEdit?.(sprint);
            else if (it.value === "delete") onDelete?.(sprint);
            else if (it.value === "start") onStart?.(sprint);
            else if (it.value === "complete") onComplete?.(sprint);
          }}
          items={items}
        />
      )}
    </>
  );
}
