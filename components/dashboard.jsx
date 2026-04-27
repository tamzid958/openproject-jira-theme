"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  formatDistanceToNowStrict,
  isToday,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { TypeIcon, Icon } from "@/components/icons";

// ─────────────────────────────────────────────────────────────────
// Tokens & helpers

const CARD = "bg-surface-elevated border border-border rounded-xl";
const CARD_PAD = "p-5";
const SECTION_HEADING =
  "flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle";

function readRecent(projectId) {
  if (typeof window === "undefined" || !projectId) return [];
  try {
    const raw = localStorage.getItem(`op:recent:${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function safeISO(s) {
  try {
    return s && s !== "—" ? parseISO(s) : null;
  } catch {
    return null;
  }
}

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good evening";
}

// ─────────────────────────────────────────────────────────────────
// Atoms

function StatCard({ label, value, hint, tone = "default", icon, onClick }) {
  const toneCls =
    tone === "danger"
      ? "border-red-200 bg-red-50/40"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/40"
      : tone === "good"
      ? "border-emerald-200 bg-emerald-50/40"
      : "";
  const valueTone =
    tone === "danger"
      ? "text-pri-highest"
      : tone === "warn"
      ? "text-amber-700"
      : tone === "good"
      ? "text-emerald-700"
      : "text-fg";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${CARD} ${toneCls} px-4 py-3.5 text-left transition-shadow ${
        onClick ? "cursor-pointer hover:shadow-[0_2px_8px_rgba(15,23,41,0.06)]" : "cursor-default"
      } disabled:cursor-default`}
    >
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size={12} className="text-fg-subtle" aria-hidden="true" />}
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-subtle">
          {label}
        </span>
      </div>
      <div className={`font-display text-[28px] font-bold leading-tight mt-1.5 ${valueTone}`}>
        {value}
      </div>
      <div className="text-[11.5px] text-fg-subtle mt-0.5">{hint}</div>
    </button>
  );
}

// Conic-gradient ring used in the sprint snapshot. Lightweight (no SVG /
// Recharts) and prints fine.
function ProgressRing({ pct, label, sub, size = 120, stroke = 10 }) {
  const safe = Math.max(0, Math.min(100, pct || 0));
  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--accent) ${safe}%, var(--surface-muted) ${safe}% 100%)`,
        borderRadius: "50%",
      }}
    >
      <div
        className="absolute bg-surface-elevated rounded-full grid place-items-center shadow-[inset_0_1px_0_rgba(15,23,41,0.04)]"
        style={{
          inset: stroke,
        }}
      >
        <div className="text-center leading-none">
          <div className="font-display text-[24px] font-bold text-fg">{label}</div>
          {sub && <div className="text-[10.5px] text-fg-subtle mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// Stacked 1-D bar showing the proportion of every status.
function StatusStack({ buckets, total }) {
  if (total === 0) {
    return (
      <div className="text-[12.5px] text-fg-subtle">No work packages yet.</div>
    );
  }
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-muted">
        {buckets.map((b) => (
          <span
            key={b.id || b.name}
            title={`${b.name}: ${b.count}`}
            className="h-full"
            style={{
              width: `${(b.count / total) * 100}%`,
              background: b.color || `var(--status-${b.bucket || "todo"})`,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
        {buckets.map((b) => (
          <span
            key={`legend-${b.id || b.name}`}
            className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-muted"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: b.color || `var(--status-${b.bucket || "todo"})` }}
              aria-hidden="true"
            />
            <span>{b.name}</span>
            <span className="text-fg-faint font-mono">{b.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function HealthBadge({ pct, daysLeft, totalDays }) {
  // Loose but useful health heuristic: if you're behind the time-equivalent
  // pct by more than 15%, you're at risk; >30% behind is "behind".
  if (totalDays == null || daysLeft == null) {
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-surface-muted text-fg-muted">
        On track
      </span>
    );
  }
  const elapsed = totalDays - daysLeft;
  const expected = totalDays > 0 ? (elapsed / totalDays) * 100 : 0;
  const drift = expected - pct;
  if (drift > 30) {
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-red-100 text-pri-highest">
        Behind
      </span>
    );
  }
  if (drift > 15) {
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700">
        At risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700">
      On track
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main

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
  const [myTab, setMyTab] = useState("assigned");

  const myId = currentUser?.id;
  const firstName = currentUser?.name?.split(" ")[0] || "there";
  const today = useMemo(() => new Date(), []);

  // ── Slices ────────────────────────────────────────────────────
  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const myTasks = useMemo(
    () => (myId ? openTasks.filter((t) => t.assignee === myId) : []),
    [openTasks, myId],
  );
  const reportedByMe = useMemo(
    () => (myId ? openTasks.filter((t) => t.reporter === myId) : []),
    [openTasks, myId],
  );

  const { dueToday, dueThisWeek, overdue } = useMemo(() => {
    const dt = [];
    const dw = [];
    const od = [];
    for (const t of tasks) {
      const due = safeISO(t.dueDate);
      if (!due) continue;
      if (t.status !== "done" && due < today) {
        od.push(t);
        continue;
      }
      if (isToday(due)) dt.push(t);
      else if (isWithinInterval(due, { start: today, end: addDays(today, 7) })) dw.push(t);
    }
    return { dueToday: dt, dueThisWeek: dw, overdue: od };
  }, [tasks, today]);

  // ── Sprint snapshot ───────────────────────────────────────────
  const sprintTasks = activeSprint
    ? tasks.filter((t) => t.sprint === activeSprint.id)
    : [];
  const totalPts = sprintTasks.reduce((s, t) => s + (t.points || 0), 0);
  const donePts = sprintTasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + (t.points || 0), 0);
  const sprintProgress = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;
  const sprintDaysLeft = (() => {
    const e = safeISO(activeSprint?.end);
    if (!e) return null;
    return Math.max(0, differenceInCalendarDays(e, today));
  })();
  const sprintEndsIn = (() => {
    const e = safeISO(activeSprint?.end);
    if (!e) return null;
    try {
      return formatDistanceToNowStrict(e, { addSuffix: true });
    } catch {
      return null;
    }
  })();

  // ── Status breakdown ─────────────────────────────────────────
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
      const k = String(s.id);
      if (map.has(k)) {
        const ent = map.get(k);
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

  // ── Team workload ────────────────────────────────────────────
  const topAssignees = useMemo(() => {
    const tally = new Map();
    for (const t of openTasks) {
      const id = t.assignee;
      if (!id) continue;
      const ent = tally.get(id) || {
        id,
        name: t.assigneeName || "—",
        count: 0,
        points: 0,
      };
      ent.count += 1;
      ent.points += t.points || 0;
      tally.set(id, ent);
    }
    return [...tally.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [openTasks]);

  // ── Sprint roadmap ───────────────────────────────────────────
  const sprintRoadmap = useMemo(() => {
    const rank = (s) =>
      s.state === "active" ? 0 : s.state === "planned" ? 1 : 2;
    return [...sprints]
      .sort((a, b) => {
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        return (a.start || "").localeCompare(b.start || "");
      })
      .slice(0, 8);
  }, [sprints]);

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

  const myList =
    myTab === "assigned" ? myTasks : myTab === "reported" ? reportedByMe : myTasks;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="grid gap-4 sm:gap-5 max-w-[1200px] mx-auto pb-10 min-w-0">
      {/* HERO ───────────────────────────────────────────────────── */}
      <header className="flex items-start gap-4 min-w-0">
        {currentUser ? (
          <Avatar user={currentUser} size="xl" />
        ) : project ? (
          <span
            className="grid place-items-center w-12 h-12 rounded-xl text-white font-bold text-lg shrink-0"
            style={{ background: project.color }}
          >
            {project.key}
          </span>
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg m-0">
              {greetingFor(today)}, {firstName}
            </h1>
            {activeSprint && (
              <HealthBadge
                pct={sprintProgress}
                daysLeft={sprintDaysLeft}
                totalDays={activeSprint.days}
              />
            )}
          </div>
          <p className="text-[13px] text-fg-subtle leading-relaxed m-0 break-words">
            <strong className="text-fg">{project?.name || "This project"}</strong>{" "}
            has{" "}
            <strong className="text-fg">
              {openTasks.length} open issue{openTasks.length === 1 ? "" : "s"}
            </strong>
            {myTasks.length > 0 && (
              <>
                {" "}
                · <strong className="text-fg">{myTasks.length} on your plate</strong>
              </>
            )}
            {activeSprint && sprintEndsIn ? (
              <> · sprint ends {sprintEndsIn}.</>
            ) : (
              "."
            )}
          </p>
        </div>
      </header>

      {/* SPRINT SNAPSHOT — full-width hero card */}
      {activeSprint ? (
        <section
          className={`${CARD} relative overflow-hidden`}
          aria-label="Active sprint"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              background:
                "radial-gradient(800px 200px at 0% 0%, var(--accent-50) 0%, transparent 60%)",
            }}
            aria-hidden="true"
          />
          <div className="relative grid grid-cols-1 lg:grid-cols-[140px_minmax(0,1fr)_auto] gap-5 p-5 min-w-0">
            <ProgressRing
              pct={sprintProgress}
              label={`${sprintProgress}%`}
              sub={`${donePts} / ${totalPts} pts`}
              size={104}
              stroke={10}
            />
            <div className="min-w-0 flex flex-col justify-center gap-1.5">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-display text-[18px] font-bold text-fg leading-tight break-words min-w-0">
                  {activeSprint.name?.split(" — ")[0]}
                </span>
                <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent-50 text-accent-700 shrink-0">
                  {activeSprint.state}
                </span>
                {activeSprint.start && activeSprint.start !== "—" && (
                  <span className="text-[12px] text-fg-subtle shrink-0">
                    {activeSprint.start} → {activeSprint.end}
                  </span>
                )}
              </div>
              {activeSprint.goal ? (
                <p className="text-[13px] text-fg-muted leading-relaxed m-0 max-w-2xl line-clamp-2 break-words">
                  {activeSprint.goal}
                </p>
              ) : (
                <p className="text-[12.5px] text-fg-faint italic m-0">
                  No sprint goal set.
                </p>
              )}
              <div className="flex items-center gap-x-4 gap-y-1 text-[11.5px] text-fg-subtle mt-1 flex-wrap">
                <span>
                  <strong className="text-fg">
                    {sprintTasks.filter((t) => t.status === "done").length}
                  </strong>{" "}
                  / {sprintTasks.length} done
                </span>
                {activeSprint.days != null && activeSprint.dayIn != null && (
                  <span>
                    Day {activeSprint.dayIn} of {activeSprint.days}
                  </span>
                )}
                {sprintDaysLeft != null && (
                  <span>
                    <strong className="text-fg">{sprintDaysLeft}</strong>{" "}
                    {sprintDaysLeft === 1 ? "day" : "days"} left
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-end justify-start lg:justify-end gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onChangeView?.("board")}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border bg-surface-elevated text-[12px] font-medium text-fg hover:bg-surface-subtle hover:border-border-strong cursor-pointer"
              >
                Board <Icon name="chev-right" size={12} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onChangeView?.("reports")}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-accent bg-accent text-white text-[12px] font-semibold hover:bg-accent-600 cursor-pointer"
              >
                Reports <Icon name="chev-right" size={12} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className={`${CARD} ${CARD_PAD} text-center`}>
          <Icon
            name="sprint"
            size={20}
            className="text-fg-faint inline-block mb-1"
            aria-hidden="true"
          />
          <div className="text-[13px] font-medium text-fg">No active sprint</div>
          <p className="text-[12.5px] text-fg-subtle mt-0.5 mb-3">
            Plan and start a sprint from the Backlog to track progress here.
          </p>
          <button
            type="button"
            onClick={() => onChangeView?.("backlog")}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-accent bg-accent text-white text-[12px] font-semibold hover:bg-accent-600 cursor-pointer"
          >
            Open Backlog
          </button>
        </section>
      )}

      {/* KPI STRIP */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Open"
          icon="list"
          value={openTasks.length}
          hint={`${tasks.length} total in project`}
        />
        <StatCard
          label="Assigned to me"
          icon="people"
          value={myTasks.length}
          hint={myTasks.length === 0 ? "All clear" : "Open work packages"}
          tone={myTasks.length > 0 ? "default" : "good"}
          onClick={myTasks.length ? () => setMyTab("assigned") : undefined}
        />
        <StatCard
          label="Due this week"
          icon="calendar"
          value={dueToday.length + dueThisWeek.length}
          hint={
            dueToday.length > 0
              ? `${dueToday.length} due today`
              : dueThisWeek.length === 0
              ? "Nothing due"
              : "Within 7 days"
          }
          tone={dueToday.length > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Overdue"
          icon="flag"
          value={overdue.length}
          hint={overdue.length === 0 ? "Nothing overdue" : "Action needed"}
          tone={overdue.length > 0 ? "danger" : "good"}
        />
      </section>

      {/* TWO-COLUMN: Today's focus + My work */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        {/* TODAY FOCUS */}
        <div className={`${CARD} ${CARD_PAD}`}>
          <div className={SECTION_HEADING}>
            <Icon name="flag" size={12} aria-hidden="true" />
            Focus today
          </div>

          {overdue.length === 0 && dueToday.length === 0 ? (
            <div className="flex items-center gap-2 text-[13px] text-fg-muted">
              <span className="inline-grid place-items-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Icon name="check" size={13} aria-hidden="true" />
              </span>
              <span className="min-w-0 truncate">
                You&apos;re clear of overdue work — nice.
              </span>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5 min-w-0">
              {[...overdue.slice(0, 4), ...dueToday.slice(0, 4 - Math.min(overdue.length, 4))]
                .slice(0, 5)
                .map((t) => {
                  const due = safeISO(t.dueDate);
                  const isOverdue = due && due < today;
                  return (
                    <li
                      key={t.id}
                      onClick={() => onTaskClick?.(t.id)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-surface-subtle min-w-0"
                    >
                      <span
                        className={`inline-block w-1 h-7 rounded-full shrink-0 ${
                          isOverdue ? "bg-pri-highest" : "bg-amber-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="shrink-0">
                        <TypeIcon type={t.type} size={13} />
                      </span>
                      <span className="flex-1 min-w-0 text-[13px] text-fg truncate">
                        <span className="text-fg-faint font-mono text-[10.5px] mr-1.5">
                          {t.key}
                        </span>
                        {t.title}
                      </span>
                      <span
                        className={`shrink-0 text-[10.5px] font-semibold uppercase tracking-wider px-1.5 h-5 inline-flex items-center rounded ${
                          isOverdue
                            ? "bg-red-100 text-pri-highest"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isOverdue
                          ? `${Math.abs(differenceInCalendarDays(due, today))}d late`
                          : "Today"}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}

          {dueThisWeek.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-soft min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle mb-2">
                Due this week ({dueThisWeek.length})
              </div>
              <ul className="flex flex-col gap-1 min-w-0">
                {dueThisWeek.slice(0, 3).map((t) => (
                  <li
                    key={t.id}
                    onClick={() => onTaskClick?.(t.id)}
                    className="flex items-center gap-2 px-1 py-1 rounded-md cursor-pointer hover:bg-surface-subtle text-[12.5px] min-w-0"
                  >
                    <span className="shrink-0">
                      <TypeIcon type={t.type} size={12} />
                    </span>
                    <span className="text-fg-faint font-mono text-[10.5px] shrink-0">
                      {t.key}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-fg-muted">
                      {t.title}
                    </span>
                    <span className="text-[10.5px] text-fg-subtle shrink-0">
                      {t.dueDate}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* MY WORK with tabs */}
        <div className={`${CARD}`}>
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border-soft">
            <span className={SECTION_HEADING.replace("mb-3", "mb-0")}>
              <Icon name="people" size={12} aria-hidden="true" />
              My work
            </span>
            <div className="ml-auto inline-flex rounded-md border border-border bg-surface-elevated p-0.5">
              {[
                { id: "assigned", label: `Assigned (${myTasks.length})` },
                { id: "reported", label: `Reported (${reportedByMe.length})` },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMyTab(opt.id)}
                  className={`inline-flex items-center h-6 px-2.5 rounded text-[11.5px] font-medium cursor-pointer ${
                    myTab === opt.id
                      ? "bg-accent-50 text-accent-700"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border-soft">
            {myList.length === 0 ? (
              <div className="px-5 py-6 text-center text-[12.5px] text-fg-subtle">
                {myTab === "assigned"
                  ? myId
                    ? "Nothing assigned to you in this project."
                    : "Sign in to see your assigned work."
                  : "You haven't reported anything in this project."}
              </div>
            ) : (
              myList.slice(0, 8).map((t) => {
                const due = safeISO(t.dueDate);
                const isOverdue = due && due < today && t.status !== "done";
                return (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick?.(t.id)}
                    className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-surface-subtle min-w-0"
                  >
                    <span className="shrink-0">
                      <TypeIcon type={t.type} size={13} />
                    </span>
                    <span className="text-[10.5px] font-mono text-fg-faint shrink-0">
                      {t.key}
                    </span>
                    <span className="flex-1 min-w-0 text-[13px] text-fg truncate">
                      {t.title}
                    </span>
                    {due && (
                      <span
                        className={`text-[10.5px] font-medium shrink-0 ${
                          isOverdue ? "text-pri-highest" : "text-fg-subtle"
                        }`}
                      >
                        {t.dueDate}
                      </span>
                    )}
                    <span className="shrink-0">
                      <StatusPill status={t.status} name={t.statusName} />
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {myList.length > 8 && (
            <button
              type="button"
              onClick={() => onChangeView?.("backlog")}
              className="w-full px-5 py-2 text-[11.5px] font-medium text-fg-muted hover:bg-surface-subtle hover:text-fg cursor-pointer border-t border-border-soft"
            >
              View all {myList.length} in Backlog →
            </button>
          )}
        </div>
      </section>

      {/* TWO-COLUMN: Status breakdown + Team workload */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${CARD} ${CARD_PAD}`}>
          <div className={SECTION_HEADING}>
            <Icon name="chart" size={12} aria-hidden="true" />
            Status breakdown
            <span className="ml-auto text-fg-faint normal-case tracking-normal font-normal">
              {tasks.length} total
            </span>
          </div>
          <StatusStack buckets={statusBreakdown} total={tasks.length} />
        </div>

        <div className={`${CARD} ${CARD_PAD}`}>
          <div className={SECTION_HEADING}>
            <Icon name="people" size={12} aria-hidden="true" />
            Team workload
            <span className="ml-auto text-fg-faint normal-case tracking-normal font-normal">
              top assignees
            </span>
          </div>
          {topAssignees.length === 0 ? (
            <div className="text-[12.5px] text-fg-subtle">
              No work is assigned to anyone yet.
            </div>
          ) : (
            <ul className="grid gap-2.5">
              {topAssignees.map((a) => {
                const max = topAssignees[0].count || 1;
                const pct = (a.count / max) * 100;
                return (
                  <li
                    key={a.id}
                    className="grid grid-cols-[28px_minmax(0,1fr)_56px] items-center gap-3"
                  >
                    <Avatar user={{ id: a.id, name: a.name }} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[12.5px] text-fg truncate">
                          {a.name}
                        </span>
                        <span className="text-[10.5px] text-fg-faint shrink-0 font-mono">
                          {a.points > 0 ? `${a.points} pts` : ""}
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-[width]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[12px] text-fg-muted text-right font-mono">
                      {a.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* SPRINT ROADMAP */}
      {sprintRoadmap.length > 0 && (
        <section className={`${CARD} ${CARD_PAD}`}>
          <div className={SECTION_HEADING}>
            <Icon name="calendar" size={12} aria-hidden="true" />
            Sprint roadmap
            <span className="ml-auto text-fg-faint normal-case tracking-normal font-normal">
              {sprints.length} total
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {sprintRoadmap.map((s) => {
              const tone =
                s.state === "active"
                  ? "border-accent-200 bg-accent-50/60"
                  : s.state === "planned"
                  ? "border-border bg-surface-elevated"
                  : "border-border-soft bg-surface-muted/40 opacity-80";
              const sTasks = tasks.filter((t) => t.sprint === s.id);
              const done = sTasks.filter((t) => t.status === "done").length;
              const pct = sTasks.length > 0 ? Math.round((done / sTasks.length) * 100) : 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChangeView?.("backlog")}
                  className={`shrink-0 w-56 text-left rounded-lg border p-3 cursor-pointer hover:shadow-[0_2px_8px_rgba(15,23,41,0.06)] transition-shadow ${tone}`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                      {s.state}
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold text-fg truncate">
                    {s.name?.split(" — ")[0]}
                  </div>
                  <div className="text-[11px] text-fg-subtle truncate mt-0.5">
                    {s.start && s.start !== "—" ? `${s.start} → ${s.end}` : "No dates"}
                  </div>
                  <div className="mt-2 h-1 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s.state === "active" ? "bg-accent" : "bg-fg-faint"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10.5px] text-fg-faint mt-1.5">
                    <span>
                      {done}/{sTasks.length}
                    </span>
                    <span>{pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* RECENTLY VIEWED */}
      {recent.length > 0 && (
        <section className={`${CARD}`}>
          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
            <span className={SECTION_HEADING.replace("mb-3", "mb-0")}>
              <Icon name="clock" size={12} aria-hidden="true" />
              Recently viewed
            </span>
          </div>
          <div className="divide-y divide-border-soft">
            {recent.map((t) => (
              <div
                key={t.id}
                onClick={() => onTaskClick?.(t.id)}
                className="flex items-center gap-2.5 px-5 py-2 cursor-pointer hover:bg-surface-subtle min-w-0"
              >
                <span className="shrink-0">
                  <TypeIcon type={t.type} size={13} />
                </span>
                <span className="text-[10.5px] font-mono text-fg-faint shrink-0">{t.key}</span>
                <span className="flex-1 min-w-0 text-[13px] text-fg truncate">
                  {t.title}
                </span>
                <span className="shrink-0">
                  <StatusPill status={t.status} name={t.statusName} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
