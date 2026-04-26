"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Icon } from "@/components/icons";
import { LoadingPill } from "@/components/ui/loading-pill";
import {
  useMarkNotificationsRead,
  useNotifications,
} from "@/lib/hooks/use-openproject-detail";

function safeDistance(iso) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function NotificationBell({ onOpenWp }) {
  const q = useNotifications();
  const mark = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);
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

  const data = q.data || { items: [], unread: 0 };
  const unread = data.unread;

  const handleClick = (n) => {
    setOpen(false);
    if (!n.readIAN) mark.mutate(n.id);
    if (n.workPackageId && onOpenWp) onOpenWp(`wp-${n.workPackageId}`);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Notifications"
        aria-label="Notifications"
        onClick={(e) => {
          setAnchorRect(e.currentTarget.getBoundingClientRect());
          setOpen((v) => !v);
        }}
        className="relative inline-flex items-center justify-center w-8 h-8 rounded-md border-0 bg-transparent text-fg-subtle cursor-pointer transition-colors hover:bg-surface-subtle hover:text-fg"
      >
        <Icon name="bell" size={16} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-3.5 px-1.25 h-3.5 rounded-full bg-pri-highest text-white text-[9px] font-bold leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
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
            className="w-90 max-h-[60vh] bg-white border border-border rounded-lg shadow-lg z-1100 overflow-hidden flex flex-col animate-pop"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-soft">
              <b className="text-xs font-semibold text-fg">Notifications</b>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => mark.mutate({ all: true })}
                  disabled={mark.isPending}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] text-fg-muted hover:bg-surface-subtle hover:text-fg cursor-pointer disabled:opacity-50"
                  title="Mark every unread notification as read"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {q.isLoading && (
                <div className="px-4 py-6 text-center">
                  <LoadingPill label="loading notifications" />
                </div>
              )}
              {!q.isLoading && data.items.length === 0 && (
                <div className="px-6 py-6 text-center text-[13px] text-fg-subtle">
                  You&apos;re all caught up 🎉
                </div>
              )}
              {!q.isLoading &&
                data.items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={[
                      "flex gap-2.5 px-3 py-2.5 cursor-pointer transition-colors border-b border-border-soft last:border-b-0",
                      n.readIAN ? "hover:bg-surface-subtle" : "bg-accent-50/40 hover:bg-accent-50",
                    ].join(" ")}
                  >
                    <Icon name="bell" size={14} className="text-fg-subtle mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-fg truncate">{n.subject}</div>
                      <div className="text-[11px] text-fg-subtle truncate mt-0.5">
                        {n.actorName ? `${n.actorName} · ` : ""}
                        {n.projectName ? `${n.projectName} · ` : ""}
                        {n.reason || ""}
                      </div>
                    </div>
                    <div className="text-[11px] text-fg-subtle shrink-0">
                      {safeDistance(n.createdAt)}
                    </div>
                  </div>
                ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
