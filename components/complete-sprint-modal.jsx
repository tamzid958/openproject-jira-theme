"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/api-client";
import { Icon } from "@/components/icons";
import { useUpdateVersion } from "@/lib/hooks/use-openproject-detail";
import { useUpdateTask } from "@/lib/hooks/use-openproject";

export function CompleteSprintModal({
  sprint,
  tasks,
  projectId,
  sprints,
  onClose,
  onCompleted,
}) {
  const [destination, setDestination] = useState("backlog");
  const updateVersion = useUpdateVersion(projectId);
  const updateTask = useUpdateTask(projectId);
  const [busy, setBusy] = useState(false);

  const inSprint = tasks.filter((t) => t.sprint === sprint.id);
  const open = inSprint.filter((t) => t.status !== "done");
  const future = sprints.filter((s) => s.id !== sprint.id && s.state !== "closed");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const handle = async () => {
    setBusy(true);
    try {
      for (const t of open) {
        const target = destination === "backlog" ? null : destination;
        await updateTask.mutateAsync({ id: t.id, patch: { sprint: target } });
      }
      await updateVersion.mutateAsync({ id: sprint.id, status: "closed" });
      toast.success(`Sprint completed · ${sprint.name}`);
      onCompleted?.();
      onClose?.();
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't complete the sprint — please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 grid place-items-center p-6 bg-[rgba(15,23,41,0.45)] backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-slide-up"
      >
        <h2 className="font-display text-lg font-bold text-fg m-0 mb-2">
          Complete {sprint.name.split(" — ")[0]}
        </h2>
        <p className="text-[13px] text-fg-subtle leading-relaxed m-0 mb-3">
          {open.length} of {inSprint.length} issues are still open. Where should they go?
        </p>
        <div className="grid gap-2 mb-3">
          <label
            className={[
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
              destination === "backlog"
                ? "border-accent bg-accent-50"
                : "border-border bg-transparent hover:bg-surface-subtle",
            ].join(" ")}
          >
            <input
              type="radio"
              checked={destination === "backlog"}
              onChange={() => setDestination("backlog")}
              className="accent-accent"
            />
            <div>
              <div className="font-semibold text-[13px] text-fg">Move to backlog</div>
              <div className="text-xs text-fg-subtle">Open issues become unscheduled.</div>
            </div>
          </label>
          {future.map((s) => (
            <label
              key={s.id}
              className={[
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                destination === s.id
                  ? "border-accent bg-accent-50"
                  : "border-border bg-transparent hover:bg-surface-subtle",
              ].join(" ")}
            >
              <input
                type="radio"
                checked={destination === s.id}
                onChange={() => setDestination(s.id)}
                className="accent-accent"
              />
              <div>
                <div className="font-semibold text-[13px] text-fg">
                  {s.name.split(" — ")[0]}
                </div>
                <div className="text-xs text-fg-subtle">
                  {s.start} – {s.end}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-white text-fg text-[13px] font-medium hover:bg-surface-subtle hover:border-border-strong disabled:opacity-50"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-accent bg-accent text-white text-[13px] font-semibold hover:bg-accent-600 hover:border-accent-600 disabled:opacity-50"
            onClick={handle}
            disabled={busy}
          >
            <Icon name="check" size={12} aria-hidden="true" />
            {busy ? "Completing…" : "Complete sprint"}
          </button>
        </div>
      </div>
    </div>
  );
}
