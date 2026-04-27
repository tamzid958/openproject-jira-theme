"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { drainQueue, listQueuedMutations } from "@/lib/offline/queue";

// Mounted once at app root. Drains the IndexedDB mutation queue when
// the browser regains connectivity, and again on initial mount in case
// a previous session left rows behind.
//
// On successful drain we invalidate the broad TanStack Query keys so
// any caches that had optimistic data get reconciled with the canonical
// server state. The cost of being broad here is one extra GET per
// scope; the alternative would be threading project/task ids through
// every queued row, which adds churn for a rarely-hit path.
export function OfflineQueueRunner() {
  const qc = useQueryClient();

  useEffect(() => {
    let timer = null;
    let inFlight = false;

    const reconcile = () => {
      qc.invalidateQueries({ queryKey: ["op", "tasks"] });
      qc.invalidateQueries({ queryKey: ["op", "wp"] });
      qc.invalidateQueries({ queryKey: ["op", "open-counts"] });
    };

    const run = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const queued = await listQueuedMutations();
        if (queued.length === 0) return;
        const { processed, failed } = await drainQueue({});
        if (processed > 0) {
          toast.success(
            processed === 1
              ? "Synced 1 offline change."
              : `Synced ${processed} offline changes.`,
          );
          reconcile();
        }
        if (failed > 0) {
          toast.error(
            failed === 1
              ? "1 offline change couldn't be replayed and was dropped."
              : `${failed} offline changes couldn't be replayed and were dropped.`,
          );
          reconcile();
        }
      } finally {
        inFlight = false;
      }
    };

    // Try once on mount in case storage carries pending rows from the
    // last session.
    run();

    const onOnline = () => {
      // Small delay so the browser actually has its connection back
      // before we start hammering — avoids racy DNS failures.
      clearTimeout(timer);
      timer = setTimeout(run, 800);
    };

    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [qc]);

  return null;
}
