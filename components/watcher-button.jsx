"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { friendlyError } from "@/lib/api-client";
import { AvatarStack, Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/icons";
import { LoadingPill } from "@/components/ui/loading-pill";
import {
  useAddWatcher,
  useRemoveWatcher,
  useWatchers,
} from "@/lib/hooks/use-openproject-detail";

export function WatcherButton({ wpId, currentUserId, canAdd = true, canRemove = true }) {
  const q = useWatchers(wpId);
  const add = useAddWatcher(wpId);
  const remove = useRemoveWatcher(wpId);
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

  const watchers = q.data || [];
  const isWatching = currentUserId
    ? watchers.some((w) => w.id === String(currentUserId))
    : false;

  const toggleWatch = async () => {
    if (!currentUserId) return;
    try {
      if (isWatching) {
        await remove.mutateAsync(currentUserId);
        toast.success("Stopped watching");
      } else {
        await add.mutateAsync(currentUserId);
        toast.success("Now watching");
      }
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't update watchers — please try again."));
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={[
          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs font-medium transition-colors",
          isWatching
            ? "border-accent-200 bg-accent-50 text-accent-700"
            : "border-border bg-surface-elevated text-fg-muted hover:bg-surface-subtle hover:border-border-strong",
        ].join(" ")}
        onClick={(e) => {
          setAnchorRect(e.currentTarget.getBoundingClientRect());
          setOpen((v) => !v);
        }}
        title={isWatching ? "Watching" : "Watch"}
        aria-label={isWatching ? "Stop watching this issue" : "Watch this issue"}
        aria-pressed={isWatching}
      >
        <Icon name="eye" size={13} aria-hidden="true" />
        {q.isLoading ? <span className="opacity-60">·</span> : watchers.length}
      </button>

      {mounted && open && anchorRect &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              left: anchorRect.left,
              top: anchorRect.bottom + 4,
              minWidth: 240,
              zIndex: 1100,
            }}
            className="bg-surface-elevated border border-border rounded-lg shadow-lg p-2 animate-pop"
          >
            {(isWatching ? canRemove : canAdd) ? (
              <div className="px-2 pb-2 mb-1.5 border-b border-border-soft">
                <button
                  type="button"
                  onClick={toggleWatch}
                  disabled={add.isPending || remove.isPending || !currentUserId}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-accent text-on-accent text-[13px] font-semibold hover:bg-accent-600 disabled:opacity-50"
                >
                  <Icon name="eye" size={12} aria-hidden="true" />
                  {isWatching ? "Stop watching" : "Watch this issue"}
                </button>
              </div>
            ) : (
              <div className="px-2 pb-2 mb-1.5 border-b border-border-soft text-xs text-fg-subtle">
                You don&apos;t have permission to change watchers.
              </div>
            )}
            {q.isLoading && <LoadingPill label="loading watchers" />}
            {!q.isLoading && watchers.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-fg-subtle">No watchers yet.</div>
            )}
            {watchers.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-[13px] hover:bg-surface-subtle"
              >
                <Avatar user={w} size="sm" />
                <span className="flex-1 truncate">{w.name}</span>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export { AvatarStack };
