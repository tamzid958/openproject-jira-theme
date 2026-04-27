"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { countQueuedMutations } from "@/lib/offline/queue";

// Small chip in the topbar that surfaces the current connectivity state
// and the size of the offline mutation queue. Hidden when online and
// empty — keeps the chrome quiet during the happy path.
const subscribeOnline = (cb) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
const getOnlineSnapshot = () => navigator.onLine !== false;
const getOnlineServerSnapshot = () => true;

export function OfflineIndicator() {
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refreshQueued = async () => {
      try {
        const n = await countQueuedMutations();
        if (!cancelled) setQueued(n);
      } catch {
        if (!cancelled) setQueued(0);
      }
    };
    refreshQueued();
    window.addEventListener("opira:offline-queue-changed", refreshQueued);
    return () => {
      cancelled = true;
      window.removeEventListener("opira:offline-queue-changed", refreshQueued);
    };
  }, []);

  if (online && queued === 0) return null;

  if (!online) {
    return (
      <span
        title="You're offline. Edits are queued and will sync when you reconnect."
        className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-status-blocked-bg text-status-blocked-fg text-[11.5px] font-semibold"
      >
        <Icon name="wifi-off" size={13} aria-hidden="true" />
        <span className="hidden sm:inline">Offline</span>
        {queued > 0 && (
          <span className="ml-0.5 px-1 rounded bg-surface-elevated/40">{queued}</span>
        )}
      </span>
    );
  }

  // Online but queue is non-empty — runner is replaying.
  return (
    <span
      title={`Syncing ${queued} queued change${queued === 1 ? "" : "s"}…`}
      className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-status-progress-bg text-status-progress-fg text-[11.5px] font-semibold"
    >
      <Icon name="cloud-upload" size={13} aria-hidden="true" />
      <span className="hidden sm:inline">Syncing</span>
      <span className="ml-0.5 px-1 rounded bg-surface-elevated/40">{queued}</span>
    </span>
  );
}
