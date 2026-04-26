"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, formatDistanceToNowStrict, isWithinInterval, parseISO } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { TypeIcon, Icon } from "@/components/icons";

const PANEL = "bg-white border border-border rounded-lg overflow-hidden";
const PANEL_HEADER =
  "flex items-center gap-2 px-4 py-3 border-b border-border-soft bg-[#fbfbfd]";
const PANEL_TITLE = "font-semibold text-[14px] text-fg m-0";
const PANEL_META = "text-xs text-fg-subtle";
const ASSIGNED_ROW =
  "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-surface-subtle border-b border-border-soft last:border-b-0";

function readRecent(projectId) {
  if (typeof window === "undefined" || !projectId) return [];
  try {
    const raw = localStorage.getItem(`op:recent:${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function Dashboard({
  project,
  currentUser,
  activeSprint,
  sprints = [],
  statuses = [],
  tasks = [],
  onTaskClick,
  onChangeView,
}) {
  const [recentIds, setRecentIds] = useState([]);

  const myId = currentUser?.id;
  const firstName = currentUser?.name?.split(" ")[0] || "there";

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const myTasks = useMemo(
    () => (myId ? openTasks.filter((t) => t.assignee === myId) : []),
    [openTasks, myId],
  );
  const today = useMemo(() => new Date(), []);
  const dueThisWeek = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueDate) return false;
        try {
          return isWithinInterval(parseISO(t.dueDate), { start: today, end: addDays(today, 7) });
        } catch {
          return false;
        }
      }),
    [tasks, today],
  );
  const overdue = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueDate || t.status === "done") return false;
        try {
          return parseISO(t.dueDate) < today;
        } catch {
          return false;
        }
      }),
    [tasks, today],
  );

  const sprintTasks = activeSprint ? tasks.filter((t) => t.sprint === activeSprint.id) : [];
  const totalPts = sprintTasks.reduce((s, t) => s + (t.points || 0), 0);
  const donePts = sprintTasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + (t.points || 0), 0);
  const sprintProgress = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;
  const sprintEndsIn =
    activeSprint?.end && activeSprint.end !== "—"
      ? (() => {
          try {
            return formatDistanceToNowStrict(parseISO(activeSprint.end), { addSuffix: true });
          } catch {
            return null;
          }
        })()
      : null;

  const statusBreakdown = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const key = t.statusId ? String(t.statusId) : `bucket:${t.status}`;
      const ent = map.get(key) || {
        id: t.statusId || null,
        name: t.statusName || t.status,
        bucket: t.status,
        position: 9999,
        isClosed: t.status === "done",
        count: 0,
      };
      ent.count += 1;
      map.set(key, ent);
    }
    for (const s of statuses) {
      const key = String(s.id);
      if (map.has(key)) {
        const ent = map.get(key);
        ent.position = s.position ?? ent.position;
        ent.isClosed = !!s.isClosed;
        ent.color = s.color || null;
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.isClosed !== b.isClosed) return a.isClosed ? 1 : -1;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  }, [tasks, statuses]);

  const topAssignees = useMemo(() => {
    const tally = new Map();
    for (const t of openTasks) {
      const id = t.assignee;
      if (!id) continue;
      const ent = tally.get(id) || { id, name: t.assigneeName || "—", count: 0 };
      ent.count += 1;
      tally.set(id, ent);
    }
    return [...tally.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [openTasks]);

  const upcomingSprints = useMemo(
    () =>
      sprints
        .filter((s) => s.id !== activeSprint?.id)
        .sort((a, b) => (a.start || "").localeCompare(b.start || ""))
        .slice(0, 4),
    [sprints, activeSprint?.id],
  );

  useEffect(() => {
    if (!project?.id) return;
    setRecentIds(readRecent(project.id));
  }, [project?.id]);

  const recent = useMemo(
    () =>
      recentIds
        .map((id) => tasks.find((t) => t.id === id))
        .filter(Boolean)
        .slice(0, 6),
    [recentIds, tasks],
  );

  return (
    <div className="grid gap-4 max-w-[1100px] mx-auto pb-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3.5">
        {project ? (
          <span
            className="grid place-items-center w-11 h-11 rounded-lg text-white font-bold text-base shrink-0"
            style={{ background: project.color }}
          >
            {project.key}
          </span>
        ) : null}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg m-0 mb-1">
            {project?.name || "Overview"}
          </h1>
          <p className="text-[13px] text-fg-subtle leading-relaxed m-0">
            Hi {firstName} —{" "}
            <b className="text-fg">
              {openTasks.length} open issue{openTasks.length === 1 ? "" : "s"}
            </b>
            {myTasks.length > 0 && (
              <>
                {" "}
                · <b className="text-fg">{myTasks.length} assigned to you</b>
              </>
            )}
            {activeSprint && sprintEndsIn ? (
              <>
                {" "}
                · {activeSprint.name?.split(" — ")[0]} ends {sprintEndsIn}.
              </>
            ) : (
              "."
            )}
          </p>
          {project?.desc ? (
            <p className="text-[13px] text-fg-subtle m-0 mt-1.5 max-w-180">{project.desc}</p>
          ) : null}
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Open issues",
            value: openTasks.length,
            delta: `${tasks.length} total in project`,
          },
          {
            label: "Assigned to me",
            value: myTasks.length,
            delta: myTasks.length === 0 ? "All clear" : "Open work packages",
          },
          {
            label: "Due this week",
            value: dueThisWeek.length,
            delta:
              overdue.length > 0
                ? `${overdue.length} overdue`
                : dueThisWeek.length === 0
                ? "Nothing due"
                : "Within 7 days",
          },
          {
            label: "Sprint progress",
            value: `${sprintProgress}%`,
            delta: totalPts > 0 ? `${donePts} of ${totalPts} pts` : "No points logged",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-border rounded-lg px-4 py-3.5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              {kpi.label}
            </div>
            <div className="font-display text-3xl font-bold text-fg leading-tight mt-1.5">
              {kpi.value}
            </div>
            <div className="text-xs text-fg-subtle mt-1">{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Active sprint ───────────────────────────────────────── */}
        <div className={PANEL}>
          <div className={PANEL_HEADER}>
            <h3 className={PANEL_TITLE}>
              {activeSprint ? activeSprint.name?.split(" — ")[0] : "No active sprint"}
            </h3>
            {activeSprint?.state ? (
              <span className={PANEL_META}>· {activeSprint.state}</span>
            ) : null}
            {activeSprint && onChangeView ? (
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium text-fg-muted hover:bg-surface-subtle hover:text-fg"
                onClick={() => onChangeView("board")}
              >
                Open board <Icon name="chev-right" size={12} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className="p-4">
            {activeSprint ? (
              <>
                <div className="flex justify-between items-baseline mb-2 text-[12px] text-fg-subtle">
                  <span>
                    {activeSprint.start && activeSprint.start !== "—"
                      ? `${activeSprint.start} → ${activeSprint.end}`
                      : "No dates set"}
                  </span>
                  {activeSprint.days != null && activeSprint.dayIn != null ? (
                    <span>
                      Day {activeSprint.dayIn} of {activeSprint.days}
                    </span>
                  ) : null}
                </div>
                <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-200 ${
                      sprintProgress === 100 ? "bg-status-done" : "bg-accent"
                    }`}
                    style={{ width: `${sprintProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-fg-subtle mt-1.5">
                  <span>
                    {sprintTasks.filter((t) => t.status === "done").length} of{" "}
                    {sprintTasks.length} issues done
                  </span>
                  <span>
                    {donePts} / {totalPts} pts
                  </span>
                </div>
                {activeSprint.goal ? (
                  <div className="mt-3 p-2.5 bg-surface-subtle rounded-md text-[12px] text-fg-muted">
                    <b className="block text-[10px] font-semibold uppercase tracking-wider text-fg-subtle mb-1">
                      Goal
                    </b>
                    {activeSprint.goal}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-[13px] text-fg-subtle py-2">
                No sprint is currently running. Create one in Backlog.
              </div>
            )}
          </div>
        </div>

        {/* ── Status breakdown ────────────────────────────────────── */}
        <div className={PANEL}>
          <div className={PANEL_HEADER}>
            <h3 className={PANEL_TITLE}>Status breakdown</h3>
            <span className={PANEL_META}>· {tasks.length} total</span>
          </div>
          <div className="px-4 py-3">
            {statusBreakdown.length === 0 ? (
              <div className="text-[13px] text-fg-subtle">No work packages yet.</div>
            ) : (
              statusBreakdown.map((s) => {
                const pct = tasks.length === 0 ? 0 : (s.count / tasks.length) * 100;
                const color = s.color || `var(--status-${s.bucket || "todo"})`;
                return (
                  <div key={s.id || s.name} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-fg-muted">{s.name}</span>
                      <span className="text-fg-subtle">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Assigned to you ─────────────────────────────────────── */}
        <div className={PANEL}>
          <div className={PANEL_HEADER}>
            <h3 className={PANEL_TITLE}>Assigned to you</h3>
            <span className={PANEL_META}>· {myTasks.length}</span>
          </div>
          <div>
            {myTasks.length === 0 && (
              <div className="px-4 py-4 text-[13px] text-fg-subtle">
                Nothing assigned in this project.
              </div>
            )}
            {myTasks.slice(0, 8).map((t) => (
              <div
                key={t.id}
                onClick={() => onTaskClick?.(t.id)}
                className={ASSIGNED_ROW}
              >
                <TypeIcon type={t.type} size={14} />
                <span className="flex-1 min-w-0 text-[13px] text-fg truncate flex items-center gap-2">
                  <span className="font-mono text-[11px] text-fg-subtle">{t.key}</span>
                  <span className="truncate">{t.title}</span>
                </span>
                <StatusPill status={t.status} name={t.statusName} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Top assignees ───────────────────────────────────────── */}
        <div className={PANEL}>
          <div className={PANEL_HEADER}>
            <h3 className={PANEL_TITLE}>Top assignees</h3>
            <span className={PANEL_META}>· open work</span>
          </div>
          <div className="p-3">
            {topAssignees.length === 0 ? (
              <div className="px-1 py-1 text-[13px] text-fg-subtle">No assignees yet.</div>
            ) : (
              topAssignees.map((a) => {
                const max = topAssignees[0]?.count || 1;
                const pct = (a.count / max) * 100;
                return (
                  <div
                    key={a.id}
                    className="grid grid-cols-[24px_minmax(0,1fr)_36px] items-center gap-2.5 px-1 py-1.5"
                  >
                    <Avatar user={a.id} size="sm" />
                    <div className="min-w-0">
                      <div className="text-[12px] text-fg-muted mb-1 truncate">{a.name}</div>
                      <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-fg-subtle text-right">{a.count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Other sprints ───────────────────────────────────────── */}
      {upcomingSprints.length > 0 ? (
        <div className={PANEL}>
          <div className={PANEL_HEADER}>
            <h3 className={PANEL_TITLE}>Other sprints in this project</h3>
            <span className={PANEL_META}>· {sprints.length} total</span>
          </div>
          <div className="p-3">
            {upcomingSprints.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-1 py-2 border-b border-border-soft last:border-b-0 text-[13px]"
              >
                <span className="truncate">{s.name?.split(" — ")[0]}</span>
                <span className="text-xs text-fg-subtle">
                  {s.start && s.start !== "—" ? `${s.start} → ${s.end}` : "No dates"}
                </span>
                <span
                  className={[
                    "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                    s.state === "active"
                      ? "bg-accent-100 text-accent-700"
                      : "bg-surface-muted text-fg-subtle",
                  ].join(" ")}
                >
                  {s.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Recently viewed ───────────────────────────────────── */}
      {recent.length > 0 && (
        <div className={PANEL}>
          <div className={PANEL_HEADER}>
            <h3 className={PANEL_TITLE}>Recently viewed</h3>
          </div>
          <div>
            {recent.map((t) => (
              <div
                key={t.id}
                onClick={() => onTaskClick?.(t.id)}
                className={ASSIGNED_ROW}
              >
                <TypeIcon type={t.type} size={14} />
                <span className="flex-1 min-w-0 text-[13px] text-fg flex items-center gap-2">
                  <span className="font-mono text-[11px] text-fg-subtle">{t.key}</span>
                  <span className="truncate">{t.title}</span>
                </span>
                <StatusPill status={t.status} name={t.statusName} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
