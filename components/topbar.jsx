"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { ShortcutsModal } from "@/components/shortcuts-modal";

const ICON_BTN =
  "inline-flex items-center justify-center w-8 h-8 rounded-md border-0 bg-transparent text-fg-subtle cursor-pointer transition-colors hover:bg-surface-subtle hover:text-fg relative";

// Topbar is intentionally lean: brand, create button, notifications,
// shortcuts, account. The command palette still opens via Cmd/Ctrl-K but
// we no longer surface it as a button — keeping the shortcut as the
// (sole) entry-point keeps the chrome from feeling crowded.
export function Topbar({
  onCreate,
  onOpenWp,
  onToggleSidebar,
  currentUser,
  canCreate = true,
}) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <header className="col-span-2 row-start-1 flex items-center gap-4 h-12 px-4 bg-white border-b border-border relative z-10">
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

      {/* Brand */}
      <div className="flex items-center gap-2 w-56 font-display font-bold text-[15px] tracking-[-0.01em] text-fg shrink-0">
        <span className="relative grid place-items-center w-6 h-6 rounded-md text-white shrink-0 overflow-hidden bg-linear-to-br from-accent to-accent-600">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10"
          >
            <path d="M5 4 13 12l-8 8M19 4l-8 8 8 8" />
          </svg>
        </span>
        <span className="hidden sm:inline">Opira</span>
      </div>

      <div className="flex-1" />

      {canCreate ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border-0 bg-accent text-white text-[13px] font-semibold transition-colors hover:bg-accent-600 shadow-[0_1px_0_rgba(15,23,41,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
          onClick={onCreate}
          aria-label="Create work package"
        >
          <Icon name="plus" size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Create</span>
        </button>
      ) : null}

      <NotificationBell onOpenWp={onOpenWp} />

      <button
        type="button"
        className={ICON_BTN}
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
