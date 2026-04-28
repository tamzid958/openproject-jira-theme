"use client";

import { useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import { friendlyError } from "@/lib/api-client";
import { Icon } from "@/components/icons";
import { LoadingPill } from "@/components/ui/loading-pill";
import {
  useCreateReminder,
  useDeleteReminder,
  useWpReminders,
} from "@/lib/hooks/use-openproject-detail";

const INPUT =
  "w-full h-9 px-3 rounded-md border border-border bg-surface-elevated text-[13px] text-fg placeholder:text-fg-faint outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)]";
const LABEL = "block text-[12px] font-semibold text-fg-muted mb-1";

// Default to "tomorrow at 9am" (local time) so a one-tap add lands
// somewhere reasonable.
function defaultRemindAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function RemindersPanel({ wpId }) {
  const q = useWpReminders(wpId);
  const create = useCreateReminder(wpId);
  const del = useDeleteReminder(wpId);
  const [showForm, setShowForm] = useState(false);
  const [remindAt, setRemindAt] = useState(defaultRemindAt());
  const [note, setNote] = useState("");

  const reminders = q.data || [];
  const upcoming = reminders.filter(
    (r) => !r.remindAt || new Date(r.remindAt) >= new Date(),
  );

  const onSubmit = async () => {
    if (!remindAt) return;
    try {
      const iso = new Date(remindAt).toISOString();
      await create.mutateAsync({ remindAt: iso, note });
      toast.success("Reminder set");
      setShowForm(false);
      setRemindAt(defaultRemindAt());
      setNote("");
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't create reminder."));
    }
  };

  const onDelete = async (id) => {
    try {
      await del.mutateAsync(id);
      toast.success("Reminder removed");
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't remove reminder."));
    }
  };

  return (
    <div>
      {q.isLoading && <LoadingPill label="loading reminders" />}
      {!q.isLoading && upcoming.length === 0 && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          aria-label="Add reminder"
          className="w-full grid grid-cols-[18px_minmax(0,1fr)_12px] items-center gap-2 px-2.5 py-2 rounded-md border border-dashed border-border text-left text-fg-subtle hover:border-accent hover:bg-accent-50 hover:text-fg transition-colors cursor-pointer"
        >
          <Icon name="bell" size={14} aria-hidden="true" />
          <span className="flex flex-col min-w-0">
            <span className="text-[12.5px] font-medium text-fg">Set a reminder</span>
            <span className="text-[11px] text-fg-faint truncate">
              Get a nudge at the time you choose
            </span>
          </span>
          <Icon name="plus" size={12} aria-hidden="true" className="text-fg-faint" />
        </button>
      )}

      {upcoming.length > 0 && (
        <ul className="grid gap-1.5 mb-2">
          {upcoming.map((r) => {
            const when = r.remindAt ? parseISO(r.remindAt) : null;
            return (
              <li
                key={r.id}
                className="grid grid-cols-[16px_minmax(0,1fr)_24px] items-start gap-2 px-2.5 py-2 rounded-md bg-surface-subtle border border-border-soft"
              >
                <Icon name="clock" size={13} className="text-fg-subtle mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-fg">
                    {when ? format(when, "MMM d, yyyy 'at' HH:mm") : "—"}
                  </div>
                  <div className="text-[11px] text-fg-subtle">
                    {when ? formatDistanceToNow(when, { addSuffix: true }) : ""}
                  </div>
                  {r.note ? (
                    <div className="text-[12px] text-fg-muted mt-1">{r.note}</div>
                  ) : null}
                </div>
                {r.permissions?.delete !== false ? (
                  <button
                    type="button"
                    aria-label="Remove reminder"
                    onClick={() => onDelete(r.id)}
                    className="grid place-items-center w-6 h-6 rounded text-fg-subtle hover:bg-surface-elevated hover:text-pri-highest cursor-pointer"
                  >
                    <Icon name="x" size={12} aria-hidden="true" />
                  </button>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!showForm && upcoming.length > 0 && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md border border-border bg-surface-elevated text-fg text-xs font-medium hover:bg-surface-subtle"
        >
          <Icon name="plus" size={12} aria-hidden="true" /> Add reminder
        </button>
      )}

      {showForm && (
        <div className="grid gap-2 mt-2">
          <div>
            <label className={LABEL}>Remind me at</label>
            <input
              type="datetime-local"
              className={INPUT}
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Note (optional)</label>
            <input
              className={INPUT}
              placeholder="What about this work package?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              disabled={create.isPending}
              onClick={() => setShowForm(false)}
              className="inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md border border-transparent bg-transparent text-xs text-fg hover:bg-surface-subtle disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={create.isPending || !remindAt}
              onClick={onSubmit}
              className="inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-md bg-accent text-on-accent text-xs font-semibold hover:bg-accent-600 disabled:opacity-50"
            >
              {create.isPending ? "Saving…" : "Set reminder"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
