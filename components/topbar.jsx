"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { ShortcutsModal } from "@/components/shortcuts-modal";
import { ThemeSwitch } from "@/components/theme-switch";
import { OfflineIndicator } from "@/components/offline-indicator";

const ICON_BTN =
  "inline-flex items-center justify-center w-8 h-8 rounded-md border-0 bg-transparent text-fg-subtle cursor-pointer transition-colors hover:bg-surface-subtle hover:text-fg relative";

// Topbar is intentionally lean: brand, create button, notifications,
// shortcuts, account. The command palette still opens via Cmd/Ctrl-K but
// we no longer surface it as a button — keeping the shortcut as the
// (sole) entry-point keeps the chrome from feeling crowded.
//
// Glass background: backdrop-blur over whatever sits behind. Reads as
// polished glass on the page surface and disappears entirely on the
// hero band where we want the eye to land on the headline.
export function Topbar({
  onCreate,
  onOpenWp,
  onToggleSidebar,
  currentUser,
  canCreate = true,
}) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <header className="col-span-2 row-start-1 flex items-center gap-2 sm:gap-4 h-12 px-2 sm:px-4 glass border-b-0 relative z-30">
      {/* Mobile hamburger — hidden on md+ */}
      <button
        type="button"
        className={`${ICON_BTN} md:hidden`}
        onClick={() => onToggleSidebar?.()}
        aria-label="Toggle sidebar"
        title="Menu"
      >
        <Icon name="menu" size={16} aria-hidden="true" />
      </button>

      {/* Brand — tiny platinum dot + tracked wordmark. Refined, restrained,
          reads as a maker's mark rather than a logo lockup. */}
      <div className="flex items-center gap-2.5 sm:w-40 md:w-56 shrink-0">
        <span
          className="relative w-1.5 h-1.5 rounded-full bg-accent shrink-0"
          style={{ boxShadow: "0 0 0 4px var(--color-accent-50)" }}
          aria-hidden="true"
        />
        <span className="hidden sm:inline font-display text-[14.5px] font-semibold tracking-[0.06em] text-fg uppercase">
          Opira
        </span>
      </div>

      <div className="flex-1" />

      {canCreate ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-accent text-accent-700 text-[12.5px] font-semibold tracking-[0.01em] transition-transform hover:-translate-y-px shadow-(--card-highlight)"
          onClick={onCreate}
          aria-label="Create work package"
        >
          <Icon name="plus" size={13} aria-hidden="true" />
          <span className="hidden sm:inline">Create</span>
        </button>
      ) : null}

      <OfflineIndicator />

      <NotificationBell onOpenWp={onOpenWp} />

      <ThemeSwitch />

      <button
        type="button"
        className={`${ICON_BTN} hidden sm:inline-flex`}
        title="Keyboard shortcuts"
        aria-label="Keyboard shortcuts"
        onClick={() => setShortcutsOpen(true)}
      >
        <Icon name="help" size={16} aria-hidden="true" />
      </button>

      <UserMenu user={currentUser} />

      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
    </header>
  );
}
