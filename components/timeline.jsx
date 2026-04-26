"use client";

import { useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  isWeekend,
  max as dateMax,
  min as dateMin,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarRange } from "lucide-react";
import { Icon, TypeIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPill } from "@/components/ui/loading-pill";
import { PEOPLE } from "@/lib/data";

// One day = N px at each zoom level. The whole grid (axis + sprint
// bands + task bars) scales off this single number, so changing zoom is
// just a re-render with no per-row math.
const ZOOM = {
  quarter: { day: 6, label: "Quarter" },
  month: { day: 14, label: "Month" },
  week: { day: 28, label: "Week" },
};

const STATUS_BAR = {
  todo: "bg-status-todo-bg text-status-todo-fg ring-1 ring-inset ring-border-strong",
  progress: "bg-accent text-white",
  review: "bg-status-review-bg text-status-review-fg",
  done: "bg-status-done text-white",
  blocked: "bg-status-blocked text-white",
};

// Heuristic completion estimate per task. Used to render the inner
// progress fill on bars and the per-group progress meter. Without
// dependency / per-WP %-done from OP, this maps the bucket to a sensible
// fraction so the visual reflects state changes immediately.
const STATUS_PROGRESS = {
  todo: 0,
  progress: 0.5,
  review: 0.8,
  done: 1,
  blocked: 0.25,
};

const GROUP_OPTIONS = [
  { id: "sprint", label: "Sprint" },
  { id: "assignee", label: "Assignee" },
  { id: "status", label: "Status" },
  { id: "type", label: "Type" },
];

const ROW_RAIL = "w-[260px] shrink-0";
const ROW_TASK_H = 32;
const ROW_GROUP_H = 44;

// ─────────────────────────────────────────────────────────────────
// Helpers

// Tolerant ISO parser. Sprints use "yyyy-MM-dd" or the literal "—" for
// missing dates; reject anything that doesn't yield a valid Date so
// downstream date-fns calls never see Invalid Date.
function safeISO(s) {
  if (!s || typeof s !== "string" || s === "—") return null;
  try {
    const d = parseISO(s);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function pickAvatar(task, assignees) {
  if (!task.assignee) return null;
  const list = Array.isArray(assignees) ? assignees : [];
  return (
    list.find((u) => String(u.id) === String(task.assignee)) ||
    PEOPLE[task.assignee] ||
    { id: task.assignee, name: task.assigneeName || "Assignee" }
  );
}

function buildAxis(rangeStart, rangeEnd, dayPx) {
  // Top tier: month lozenges, anchored to the visible portion of each
  // month so partial months on either end render at the correct width.
  const months = [];
  let cur = startOfMonth(rangeStart);
  while (cur <= rangeEnd) {
    const visStart = cur < rangeStart ? rangeStart : cur;
    const visEnd = endOfMonth(cur) > rangeEnd ? rangeEnd : endOfMonth(cur);
    const offsetDays = differenceInCalendarDays(visStart, rangeStart);
    const lengthDays = differenceInCalendarDays(visEnd, visStart) + 1;
    months.push({
      key: format(cur, "yyyy-MM"),
      label: format(cur, "MMM yyyy"),
      left: offsetDays * dayPx,
      width: lengthDays * dayPx,
    });
    cur = addMonths(cur, 1);
  }

  // Bottom tier: day ticks. Density adapts to zoom so labels never collide.
  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
  const tickEvery = dayPx >= 24 ? 1 : dayPx >= 12 ? 3 : 7;
  const startWeekday =
    dayPx >= 12
      ? 0
      : differenceInCalendarDays(startOfWeek(rangeStart, { weekStartsOn: 1 }), rangeStart);
  const ticks = [];
  for (let i = Math.max(0, startWeekday); i < totalDays; i += tickEvery) {
    const d = addDays(rangeStart, i);
    ticks.push({
      key: i,
      label: dayPx >= 24 ? format(d, "d") : format(d, "MMM d"),
      sub: dayPx >= 24 ? format(d, "EEEEE") : null,
      left: i * dayPx,
      isWeekend: isWeekend(d),
    });
  }
  return { months, ticks, totalDays };
}

// Group selector — produces { key, label, meta, sprint?, tasks[] } for
// each group. Sprint mode is the only one with a swim-lane band; the
// others render their group title and a count.
function groupTasks(tasks, mode, { sprints, assignees }) {
  const out = new Map();
  const ensure = (key, label, extras = {}) => {
    if (!out.has(key)) out.set(key, { key, label, tasks: [], ...extras });
    return out.get(key);
  };

  if (mode === "sprint") {
    const sList = Array.isArray(sprints) ? sprints : [];
    for (const sp of sList) {
      ensure(`sp-${sp.id}`, sp.name?.split(" — ")[0] || sp.name || "Sprint", {
        sprint: sp,
        rank: sp.state === "active" ? 0 : sp.state === "planned" ? 1 : 2,
      });
    }
    for (const t of tasks) {
      const k = t.sprint != null ? `sp-${t.sprint}` : "sp-none";
      const g = ensure(k, k === "sp-none" ? "Without sprint" : "Sprint", {
        rank: k === "sp-none" ? 99 : 1,
      });
      // Keep the actual sprint metadata if it was pre-seeded
      if (k !== "sp-none" && !g.sprint) {
        const found = sList.find((s) => `sp-${s.id}` === k);
        if (found) g.sprint = found;
      }
      g.tasks.push(t);
    }
    return [...out.values()]
      .filter((g) => g.tasks.length > 0 || g.sprint) // keep empty real sprints visible
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  }

  if (mode === "assignee") {
    const aList = Array.isArray(assignees) ? assignees : [];
    for (const t of tasks) {
      const k = t.assignee ? `u-${t.assignee}` : "u-none";
      const user = aList.find((u) => String(u.id) === String(t.assignee));
      const label = user?.name || t.assigneeName || (k === "u-none" ? "Unassigned" : "User");
      ensure(k, label, { user: user || (t.assignee ? { id: t.assignee, name: label } : null) }).tasks.push(t);
    }
    return [...out.values()].sort((a, b) => {
      if (a.key === "u-none") return 1;
      if (b.key === "u-none") return -1;
      return a.label.localeCompare(b.label);
    });
  }

  if (mode === "status") {
    const order = { progress: 0, review: 1, todo: 2, blocked: 3, done: 4 };
    for (const t of tasks) {
      const k = `s-${t.status || "todo"}`;
      ensure(k, t.statusName || (t.status || "Todo"), { status: t.status || "todo" }).tasks.push(t);
    }
    return [...out.values()].sort(
      (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9),
    );
  }

  if (mode === "type") {
    for (const t of tasks) {
      const k = `t-${t.type || "task"}`;
      ensure(k, (t.type || "task").replace(/^./, (c) => c.toUpperCase()), {
        ttype: t.type || "task",
      }).tasks.push(t);
    }
    return [...out.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  return [];
}

function progressOf(tasks) {
  if (!tasks?.length) return { pct: 0, done: 0, total: 0 };
  let done = 0;
  let weight = 0;
  for (const t of tasks) {
    weight += STATUS_PROGRESS[t.status] ?? 0;
    if (t.status === "done") done += 1;
  }
  return {
    pct: Math.round((weight / tasks.length) * 100),
    done,
    total: tasks.length,
  };
}

// ─────────────────────────────────────────────────────────────────
// Atoms

function StatePill({ state }) {
  if (!state) return null;
  const tone =
    state === "active"
      ? "bg-accent-50 text-accent-700"
      : state === "planned"
      ? "bg-surface-app text-fg-muted ring-1 ring-inset ring-border"
      : "bg-surface-muted text-fg-faint";
  return (
    <span
      className={`inline-flex items-center px-1.5 h-4 rounded text-[10px] font-semibold uppercase tracking-wider ${tone}`}
    >
      {state}
    </span>
  );
}

function ProgressDot({ pct }) {
  // Tiny donut-like indicator. Uses a single conic gradient so it scales
  // and prints without an extra SVG asset.
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <span
      className="relative w-3.5 h-3.5 rounded-full shrink-0"
      style={{
        background: `conic-gradient(var(--accent) ${safe}%, var(--border) ${safe}% 100%)`,
      }}
      title={`${safe}% complete`}
    >
      <span className="absolute inset-[3px] rounded-full bg-surface-elevated" />
    </span>
  );
}

function TaskBar({ task, rangeStart, dayPx, assignees, onClick }) {
  const start = safeISO(task.startDate);
  const end = safeISO(task.dueDate);
  if (!start || !end) return null;
  const offsetDays = differenceInCalendarDays(start, rangeStart);
  const spanDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const left = offsetDays * dayPx;
  const width = Math.max(dayPx, spanDays * dayPx);
  const klass = STATUS_BAR[task.status] || STATUS_BAR.todo;
  const avatar = pickAvatar(task, assignees);
  const pct = Math.round((STATUS_PROGRESS[task.status] ?? 0) * 100);
  return (
    <button
      type="button"
      onClick={() => onClick?.(task.id)}
      title={`${task.key}  ·  ${format(start, "MMM d")} → ${format(end, "MMM d")} (${spanDays}d)`}
      className={`group absolute top-1 bottom-1 inline-flex items-center gap-1.5 px-2 rounded-md text-[11.5px] font-medium overflow-hidden cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(15,23,41,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${klass}`}
      style={{ left, width }}
    >
      {/* Inner progress fill — sits behind the label and avatar. */}
      {pct > 0 && pct < 100 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-black/15"
          style={{ width: `${pct}%` }}
        />
      )}
      {avatar && (
        <span className="relative shrink-0">
          <Avatar user={avatar} size="sm" />
        </span>
      )}
      <span className="relative truncate">{task.title}</span>
    </button>
  );
}

function SprintBand({ sprint, tasks, rangeStart, dayPx }) {
  const s = safeISO(sprint?.start);
  const e = safeISO(sprint?.end);
  if (!s || !e) return null;
  const left = differenceInCalendarDays(s, rangeStart) * dayPx;
  const spanDays = differenceInCalendarDays(e, s) + 1;
  const width = Math.max(dayPx, spanDays * dayPx);
  const tone =
    sprint.state === "active"
      ? "bg-accent-50/80 ring-accent-200"
      : sprint.state === "planned"
      ? "bg-surface-app/90 ring-border"
      : "bg-surface-muted/60 ring-border-strong";
  const { pct } = progressOf(tasks);
  return (
    <div
      className={`absolute top-2 bottom-2 rounded-md ring-1 ring-inset overflow-hidden ${tone}`}
      style={{ left, width }}
    >
      {/* Progress fill */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-accent/15"
        style={{ width: `${pct}%` }}
      />
      {/* Edge labels — only render when there's room so they don't crash
          into the bar at small zooms. */}
      {width > 80 && (
        <>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-fg-muted">
            {format(s, "MMM d")}
          </span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-fg-muted">
            {format(e, "MMM d")}
          </span>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Group rail leader (left column row for a group header)

function GroupLeader({ group, mode, open, onToggle }) {
  const { tasks } = group;
  const { pct, done, total } = progressOf(tasks);
  const Icon_ = ({ name }) => (
    <Icon name={name} size={12} className="text-fg-subtle shrink-0" aria-hidden="true" />
  );
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 bg-surface-sunken hover:bg-surface-subtle cursor-pointer text-left border-b border-border-soft"
      style={{ height: ROW_GROUP_H }}
    >
      <Icon name={open ? "chev-down" : "chev-right"} size={11} className="text-fg-subtle" aria-hidden="true" />
      {mode === "sprint" && <Icon_ name="sprint" />}
      {mode === "assignee" &&
        (group.user ? <Avatar user={group.user} size="sm" /> : <Icon_ name="people" />)}
      {mode === "status" && (
        <span
          aria-hidden="true"
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ background: `var(--status-${group.status || "todo"}, #cbd1d8)` }}
        />
      )}
      {mode === "type" && <TypeIcon type={group.ttype || "task"} size={12} />}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12.5px] font-semibold text-fg truncate">{group.label}</span>
          {mode === "sprint" && group.sprint && <StatePill state={group.sprint.state} />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-fg-faint">
          {total > 0 ? (
            <>
              <span>
                {done}/{total} done
              </span>
              <span>·</span>
              <span>{pct}%</span>
            </>
          ) : (
            <span>No work yet</span>
          )}
        </div>
      </div>

      <ProgressDot pct={pct} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// Public

export function Timeline({ tasks = [], sprints = [], assignees = [], onTaskClick, isLoading }) {
  const [zoom, setZoom] = useState("month");
  const [groupBy, setGroupBy] = useState("sprint");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [showUndated, setShowUndated] = useState(false);
  const scrollRef = useRef(null);

  const dated = useMemo(
    () => tasks.filter((t) => t.startDate && t.dueDate),
    [tasks],
  );
  const undated = useMemo(
    () => tasks.filter((t) => !t.startDate || !t.dueDate),
    [tasks],
  );

  // Range = union of every dated task and every dated sprint, padded by
  // 3 days on each side so bars never touch the edge.
  const { rangeStart, rangeEnd } = useMemo(() => {
    const dates = [];
    for (const t of dated) {
      const s = safeISO(t.startDate);
      const e = safeISO(t.dueDate);
      if (s) dates.push(s);
      if (e) dates.push(e);
    }
    for (const sp of Array.isArray(sprints) ? sprints : []) {
      const s = safeISO(sp.start);
      const e = safeISO(sp.end);
      if (s) dates.push(s);
      if (e) dates.push(e);
    }
    if (dates.length === 0) {
      const today = new Date();
      return { rangeStart: addDays(today, -14), rangeEnd: addDays(today, 21) };
    }
    return {
      rangeStart: addDays(dateMin(dates), -3),
      rangeEnd: addDays(dateMax(dates), 3),
    };
  }, [dated, sprints]);

  const dayPx = ZOOM[zoom].day;
  const axis = useMemo(
    () => buildAxis(rangeStart, rangeEnd, dayPx),
    [rangeStart, rangeEnd, dayPx],
  );
  const totalWidth = axis.totalDays * dayPx;

  const today = new Date();
  const todayLeft =
    today >= rangeStart && today <= rangeEnd
      ? differenceInCalendarDays(today, rangeStart) * dayPx
      : null;

  // Group on dated tasks only. Undated tasks live in the bottom drawer.
  const groups = useMemo(
    () => groupTasks(dated, groupBy, { sprints, assignees }),
    [dated, groupBy, sprints, assignees],
  );

  const jumpToToday = () => {
    if (!scrollRef.current || todayLeft == null) return;
    const el = scrollRef.current;
    el.scrollTo({
      left: Math.max(0, todayLeft - el.clientWidth / 2),
      behavior: "smooth",
    });
  };

  const toggleGroup = (key) =>
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <LoadingPill label="loading timeline" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-6 py-10">
        <EmptyState
          icon={CalendarRange}
          title="Nothing to plan yet"
          body="Create work packages with start and due dates and they'll lay out as a timeline here."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-elevated">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border-soft shrink-0 flex-wrap">
        <span className="text-[12px] text-fg-muted font-medium">
          {format(rangeStart, "MMM d, yyyy")} – {format(rangeEnd, "MMM d, yyyy")}
        </span>
        <span className="text-[12px] text-fg-faint">·</span>
        <span className="text-[12px] text-fg-subtle">
          {dated.length} on timeline{undated.length > 0 ? ` · ${undated.length} undated` : ""}
        </span>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Group-by */}
          <div className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
            <span className="font-medium">Group by</span>
            <div className="inline-flex rounded-md border border-border bg-surface-elevated p-0.5">
              {GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGroupBy(opt.id)}
                  className={`inline-flex items-center h-6 px-2 rounded text-[11.5px] font-medium cursor-pointer ${
                    groupBy === opt.id
                      ? "bg-accent-50 text-accent-700"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Today */}
          <button
            type="button"
            onClick={jumpToToday}
            disabled={todayLeft == null}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium text-fg-muted hover:bg-surface-subtle hover:text-fg cursor-pointer disabled:opacity-40 disabled:cursor-default"
            title={todayLeft == null ? "Today is outside the range" : "Scroll to today"}
          >
            <Icon name="calendar" size={12} aria-hidden="true" />
            Today
          </button>

          {/* Zoom */}
          <div className="inline-flex rounded-md border border-border bg-surface-elevated p-0.5">
            {Object.entries(ZOOM).map(([key, def]) => (
              <button
                key={key}
                type="button"
                onClick={() => setZoom(key)}
                className={`inline-flex items-center h-6 px-2.5 rounded text-[11.5px] font-medium cursor-pointer ${
                  zoom === key
                    ? "bg-accent-50 text-accent-700"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {def.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────
          Left rail and chart use a shared single vertical scroll so
          group headers and bars stay aligned, while the chart scrolls
          horizontally on its own. */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left rail (sticky horizontally) */}
        <div className={`${ROW_RAIL} border-r border-border bg-surface-elevated flex flex-col`}>
          <div
            className="flex items-end px-3 pb-2 bg-surface-sunken border-b border-border"
            style={{ height: 48 }}
          >
            <span className="text-[11px] uppercase font-semibold tracking-wider text-fg-subtle">
              Work item
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {groups.map((g) => {
              const open = !collapsed.has(g.key);
              return (
                <div key={g.key}>
                  <GroupLeader
                    group={g}
                    mode={groupBy}
                    open={open}
                    onToggle={() => toggleGroup(g.key)}
                  />
                  {open &&
                    g.tasks.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => onTaskClick?.(t.id)}
                        className="w-full grid grid-cols-[14px_1fr] gap-1.5 items-center px-3 pl-7 text-left hover:bg-surface-subtle cursor-pointer border-b border-border-soft"
                        style={{ height: ROW_TASK_H }}
                        title={t.title}
                      >
                        <TypeIcon type={t.type} size={12} />
                        <span className="truncate text-[12.5px] text-fg">
                          <span className="text-fg-faint font-mono text-[10.5px] mr-1.5">
                            {t.key}
                          </span>
                          {t.title}
                        </span>
                      </button>
                    ))}
                </div>
              );
            })}
            {groups.length === 0 && (
              <div className="px-3 py-6 text-[12px] text-fg-subtle">
                No grouped items.
              </div>
            )}
          </div>
        </div>

        {/* Chart (horizontal scroll) */}
        <div ref={scrollRef} className="flex-1 min-w-0 overflow-auto bg-surface-elevated">
          <div className="relative" style={{ width: totalWidth }}>
            {/* ── Axis (sticky to top of the scroller) ── */}
            <div
              className="sticky top-0 z-20 bg-surface-sunken border-b border-border"
              style={{ height: 48 }}
              aria-hidden="true"
            >
              <div className="absolute inset-x-0 top-0 h-6 border-b border-border-soft">
                {axis.months.map((m) => (
                  <span
                    key={m.key}
                    className="absolute top-0 h-6 inline-flex items-center px-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted border-r border-border-soft"
                    style={{ left: m.left, width: m.width }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="absolute inset-x-0 top-6 h-6">
                {axis.ticks.map((t) => (
                  <span
                    key={t.key}
                    className={`absolute top-0 h-6 inline-flex flex-col items-center text-[10px] font-medium ${
                      t.isWeekend ? "text-fg-faint" : "text-fg-subtle"
                    }`}
                    style={{ left: t.left }}
                  >
                    <span>{t.label}</span>
                    {t.sub && <span className="text-fg-faint">{t.sub}</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Chart body ── */}
            <div className="relative">
              {/* Vertical guides + weekend stripes (cover all rows). */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                {axis.ticks.map((t) => (
                  <span
                    key={t.key}
                    className={`absolute top-0 bottom-0 w-px ${
                      t.isWeekend ? "bg-border-soft/70" : "bg-border-soft/40"
                    }`}
                    style={{ left: t.left }}
                  />
                ))}
                {todayLeft != null && (
                  <>
                    <span
                      className="absolute top-0 bottom-0 w-px bg-pri-highest/70"
                      style={{ left: todayLeft }}
                    />
                    <span
                      className="sticky -top-0.5 inline-flex items-center"
                      style={{ left: todayLeft }}
                    />
                  </>
                )}
              </div>

              {/* Today pill — sticky at the top of the chart (vertically). */}
              {todayLeft != null && (
                <span
                  className="sticky top-12 z-30 inline-block -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-pri-highest text-white text-[9px] font-bold uppercase tracking-wider shadow-sm"
                  style={{ left: todayLeft, marginTop: 2 }}
                  aria-hidden="true"
                >
                  Today
                </span>
              )}

              {/* Rows mirror the rail row-for-row so headers + bars stay aligned. */}
              {groups.map((g) => {
                const open = !collapsed.has(g.key);
                return (
                  <div key={g.key}>
                    <div
                      className="relative bg-surface-sunken border-b border-border-soft"
                      style={{ height: ROW_GROUP_H }}
                    >
                      {groupBy === "sprint" && g.sprint && (
                        <SprintBand
                          sprint={g.sprint}
                          tasks={g.tasks}
                          rangeStart={rangeStart}
                          dayPx={dayPx}
                        />
                      )}
                    </div>
                    {open &&
                      g.tasks.map((t) => (
                        <div
                          key={t.id}
                          className="relative border-b border-border-soft hover:bg-surface-subtle"
                          style={{ height: ROW_TASK_H }}
                        >
                          <TaskBar
                            task={t}
                            rangeStart={rangeStart}
                            dayPx={dayPx}
                            assignees={assignees}
                            onClick={onTaskClick}
                          />
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Undated drawer ─────────────────────────────────────── */}
      {undated.length > 0 && (
        <div className="border-t border-border bg-surface-sunken shrink-0">
          <button
            type="button"
            onClick={() => setShowUndated((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-surface-subtle"
          >
            <Icon
              name={showUndated ? "chev-down" : "chev-right"}
              size={11}
              className="text-fg-subtle"
              aria-hidden="true"
            />
            <span className="text-[12px] font-semibold text-fg">Without dates</span>
            <span className="text-[11px] text-fg-subtle">{undated.length}</span>
            <span className="ml-auto text-[11px] text-fg-subtle">
              Set start &amp; due dates to plot
            </span>
          </button>
          {showUndated && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 px-4 pb-3 max-h-56 overflow-y-auto">
              {undated.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTaskClick?.(t.id)}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-[12.5px] text-fg-subtle cursor-pointer rounded hover:bg-surface-elevated border border-transparent hover:border-border-soft text-left"
                >
                  <TypeIcon type={t.type} size={12} />
                  <span className="font-mono text-[10.5px] text-fg-faint">{t.key}</span>
                  <span className="flex-1 truncate text-fg">{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
