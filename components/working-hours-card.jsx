"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { friendlyError } from "@/lib/api-client";
import { Icon } from "@/components/icons";
import { LoadingPill } from "@/components/ui/loading-pill";
import {
  useAddNonWorkingTime,
  useDeleteNonWorkingTime,
  useNonWorkingTimes,
  useWorkingHours,
} from "@/lib/hooks/use-openproject";

const WEEKDAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INPUT =
  "h-8 px-2 rounded-md border border-border bg-surface-elevated text-[12.5px] text-fg outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-100)]";

export function WorkingHoursCard({ userId }) {
  const whQ = useWorkingHours(userId, !!userId);
  const ntQ = useNonWorkingTimes(userId, !!userId);
  const add = useAddNonWorkingTime(userId);
  const del = useDeleteNonWorkingTime(userId);
  const [name, setName] = useState("");
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [end, setEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  if (!userId) {
    return (
      <div className="text-[13px] text-fg-subtle">
        Sign in with OpenProject to manage your working hours.
      </div>
    );
  }

  const onAdd = async () => {
    if (!start) return;
    try {
      await add.mutateAsync({ name: name || "Time off", start, end: end || start, allDay: true });
      toast.success("Time off added");
      setName("");
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't save"));
    }
  };

  const onDelete = async (id) => {
    try {
      await del.mutateAsync(id);
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't delete"));
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-[12px] uppercase tracking-wider font-semibold text-fg-subtle mb-2">
          Weekly schedule
        </div>
        {whQ.isLoading ? (
          <LoadingPill label="loading hours" />
        ) : (whQ.data?.length || 0) === 0 ? (
          <div className="text-[13px] text-fg-subtle">
            No weekly hours configured. Set them in OpenProject &gt; My account.
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-7 gap-1.5">
            {whQ.data.map((wh) => (
              <li
                key={wh.id}
                className="rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-[12px]"
              >
                <div className="font-semibold text-fg">{WEEKDAYS[wh.weekday] || `Day ${wh.weekday}`}</div>
                <div className="text-fg-subtle">
                  {wh.start && wh.end ? `${wh.start}–${wh.end}` : `${wh.hours ?? 0}h`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="text-[12px] uppercase tracking-wider font-semibold text-fg-subtle mb-2">
          Time off
        </div>
        {ntQ.isLoading && <LoadingPill label="loading time off" />}
        {(ntQ.data?.length || 0) > 0 && (
          <ul className="grid gap-1.5 mb-3">
            {ntQ.data.map((nt) => (
              <li
                key={nt.id}
                className="grid grid-cols-[16px_minmax(0,1fr)_24px] items-center gap-2 px-2.5 py-2 rounded-md bg-surface-subtle border border-border-soft"
              >
                <Icon name="calendar" size={13} className="text-fg-subtle" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-fg">{nt.name}</div>
                  <div className="text-[11px] text-fg-subtle">
                    {nt.start
                      ? nt.end && nt.end !== nt.start
                        ? `${format(parseISO(nt.start), "MMM d")} – ${format(parseISO(nt.end), "MMM d, yyyy")}`
                        : format(parseISO(nt.start), "MMM d, yyyy")
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove time off"
                  onClick={() => onDelete(nt.id)}
                  className="grid place-items-center w-6 h-6 rounded text-fg-subtle hover:bg-surface-elevated hover:text-pri-highest cursor-pointer"
                >
                  <Icon name="x" size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_auto] gap-2">
          <input
            className={INPUT}
            placeholder="Reason (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="date"
            className={INPUT}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="date"
            className={INPUT}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={add.isPending || !start}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-on-accent text-xs font-semibold hover:bg-accent-600 disabled:opacity-50"
          >
            <Icon name="plus" size={12} aria-hidden="true" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
