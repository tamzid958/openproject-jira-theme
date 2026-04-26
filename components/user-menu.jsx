"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/icons";

export function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const handleSignOut = async () => {
    qc.clear();
    await signOut({ callbackUrl: "/sign-in" });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={user?.name || "Account"}
        aria-label={user?.name || "Account menu"}
        onClick={(e) => {
          setAnchorRect(e.currentTarget.getBoundingClientRect());
          setOpen((v) => !v);
        }}
        className="grid place-items-center w-7 h-7 rounded-full bg-accent text-white text-[11px] font-semibold cursor-pointer border-0"
      >
        {initials}
      </button>
      {mounted && open && anchorRect &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              right: window.innerWidth - anchorRect.right,
              top: anchorRect.bottom + 6,
            }}
            className="w-64 bg-white border border-border rounded-lg shadow-lg z-1100 overflow-hidden animate-pop"
          >
            <div className="px-3 py-2.5 border-b border-border-soft">
              <div className="text-[13px] font-semibold text-fg truncate">
                {user?.name || "Anonymous"}
              </div>
              {(user?.email || user?.login) && (
                <div className="text-[11px] text-fg-subtle truncate">
                  {user.email || user.login}
                </div>
              )}
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_OPENPROJECT_URL || ""}/my/account`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-fg-muted hover:bg-surface-subtle hover:text-fg no-underline cursor-pointer"
            >
              <Icon name="settings" size={14} aria-hidden="true" /> Account settings
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-fg-muted hover:bg-surface-subtle hover:text-pri-highest cursor-pointer text-left border-0 bg-transparent"
            >
              <Icon name="x" size={14} aria-hidden="true" /> Sign out
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
