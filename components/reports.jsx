"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { LoadingPill } from "@/components/ui/loading-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/icons";
import { useBurndown, useVelocity } from "@/lib/hooks/use-openproject-detail";

const PANEL =
  "bg-surface-elevated border border-border rounded-xl overflow-hidden";
const PANEL_HEADER =
  "flex items-center flex-wrap gap-3 px-5 py-3.5 border-b border-border-soft";
const PANEL_TITLE =
  "font-display font-bold text-[15px] text-fg m-0 leading-none";
const PANEL_SUB = "text-xs text-fg-subtle";
const SWATCH = "inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5";

function Stat({ label, value, sub }) {
  return (
    <div className="flex-1 min-w-32 px-5 py-3.5 bg-surface-elevated border border-border rounded-xl">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className="font-display text-2xl font-bold text-fg leading-tight mt-1">
        {value}
      </div>
      {sub ? <div className="text-xs text-fg-subtle mt-0.5">{sub}</div> : null}
    </div>
  );
}

function Burndown({ projectId, sprint }) {
  const q = useBurndown(projectId, sprint?.id, !!projectId && !!sprint?.id);

  if (q.isLoading) {
    return (
      <div className={PANEL}>
        <div className={PANEL_HEADER}>
          <h3 className={PANEL_TITLE}>Sprint burndown</h3>
          <LoadingPill label="reconstructing from activities" />
        </div>
      </div>
    );
  }

  const data = q.data || { points: [], totalCommitted: 0, sprint: {} };
  const totalPts = data.totalCommitted || 0;
  const days =
    sprint?.start && sprint?.end && sprint.start !== "—"
      ? Math.max(1, differenceInCalendarDays(parseISO(sprint.end), parseISO(sprint.start)))
      : 14;

  // Responsive SVG canvas — viewBox stays the same; the container scales it.
  const W = 760;
  const H = 320;
  const PAD_L = 48;
  const PAD_R = 24;
  const PAD_T = 24;
  const PAD_B = 36;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xAt = (i) => PAD_L + (i / Math.max(days, 1)) * innerW;
  const yAt = (pts) => PAD_T + (1 - pts / Math.max(totalPts, 1)) * innerH;

  const idealPath = `M ${xAt(0)} ${yAt(totalPts)} L ${xAt(days)} ${yAt(0)}`;
  const actualPath = (data.points || [])
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.remaining)}`)
    .join(" ");
  const todayIdx = (data.points || []).length - 1;
  const lastRemaining = data.points?.[todayIdx]?.remaining;
  const projectedDelta =
    lastRemaining != null && totalPts > 0 && todayIdx >= 0
      ? lastRemaining - totalPts * (1 - todayIdx / Math.max(days, 1))
      : null;

  return (
    <div className={PANEL}>
      <div className={PANEL_HEADER}>
        <h3 className={PANEL_TITLE}>Sprint burndown</h3>
        <span className={PANEL_SUB}>
          {sprint?.name?.split(" — ")[0] || "Active sprint"}
          {sprint?.start && sprint.start !== "—"
            ? `  •  ${sprint.start} → ${sprint.end}`
            : ""}
        </span>
        <div className="ml-auto flex items-center gap-3 text-xs text-fg-subtle">
          <span className="inline-flex items-center">
            <span
              className={SWATCH}
              style={{ background: "transparent", border: "1.5px dashed var(--text-3)" }}
            />
            Ideal
          </span>
          <span className="inline-flex items-center">
            <span className={SWATCH} style={{ background: "var(--accent)" }} />
            Remaining
          </span>
          {todayIdx >= 0 && (
            <span className="inline-flex items-center">
              <span className={SWATCH} style={{ background: "var(--pri-high)" }} />
              Today
            </span>
          )}
        </div>
      </div>
      {totalPts === 0 ? (
        <EmptyState
          title="Burndown needs story points"
          body="Add story points to work packages in this sprint to see the burndown line."
        />
      ) : (
        <div className="px-2 pt-3 pb-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto block"
            role="img"
            aria-label="Sprint burndown chart"
          >
            {/* horizontal gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <line
                key={f}
                x1={PAD_L}
                x2={W - PAD_R}
                y1={PAD_T + f * innerH}
                y2={PAD_T + f * innerH}
                stroke="var(--border-soft)"
                strokeWidth="1"
              />
            ))}
            {/* y-axis labels */}
            {[0, 0.5, 1].map((f) => {
              const v = totalPts * (1 - f);
              return (
                <text
                  key={f}
                  x={PAD_L - 8}
                  y={PAD_T + f * innerH + 4}
                  fontSize="11"
                  textAnchor="end"
                  fill="var(--text-3)"
                >
                  {Math.round(v)}
                </text>
              );
            })}
            {/* x-axis day labels (every ~3 days) */}
            {Array.from({ length: days + 1 }, (_, i) => i)
              .filter((i) => i % Math.max(1, Math.ceil(days / 6)) === 0 || i === days)
              .map((i) => (
                <text
                  key={i}
                  x={xAt(i)}
                  y={H - PAD_B + 16}
                  fontSize="11"
                  textAnchor="middle"
                  fill="var(--text-3)"
                >
                  Day {i}
                </text>
              ))}
            {/* y-axis title */}
            <text
              x={12}
              y={PAD_T + innerH / 2}
              fontSize="11"
              fill="var(--text-3)"
              transform={`rotate(-90 12 ${PAD_T + innerH / 2})`}
              textAnchor="middle"
            >
              Story points
            </text>
            {/* ideal line */}
            <path
              d={idealPath}
              stroke="var(--text-3)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            {/* today vertical */}
            {todayIdx >= 0 && (
              <line
                x1={xAt(todayIdx)}
                x2={xAt(todayIdx)}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="var(--pri-high)"
                strokeWidth="1.5"
                strokeDasharray="2 4"
              />
            )}
            {/* actual line + dots */}
            {actualPath && (
              <path
                d={actualPath}
                stroke="var(--accent)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {(data.points || []).map((p, i) => (
              <circle
                key={i}
                cx={xAt(i)}
                cy={yAt(p.remaining)}
                r="3.5"
                fill="white"
                stroke="var(--accent)"
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>
      )}
      {totalPts > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border-soft border-t border-border-soft">
          <div className="bg-surface-elevated px-5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              Committed
            </div>
            <div className="font-display text-lg font-bold text-fg mt-0.5">
              {totalPts} pts
            </div>
          </div>
          <div className="bg-surface-elevated px-5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              Remaining
            </div>
            <div className="font-display text-lg font-bold text-fg mt-0.5">
              {lastRemaining ?? totalPts} pts
            </div>
          </div>
          <div className="bg-surface-elevated px-5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              Trend
            </div>
            <div
              className={`font-display text-lg font-bold mt-0.5 ${
                projectedDelta != null && projectedDelta > 0
                  ? "text-pri-high"
                  : projectedDelta != null && projectedDelta < 0
                  ? "text-status-done"
                  : "text-fg"
              }`}
            >
              {projectedDelta == null
                ? "—"
                : projectedDelta > 0
                ? `+${Math.round(projectedDelta)} behind`
                : projectedDelta < 0
                ? `${Math.round(projectedDelta)} ahead`
                : "On track"}
            </div>
          </div>
        </div>
      )}
      <div className="px-5 py-2.5 text-[11px] text-fg-faint bg-surface-app border-t border-border-soft">
        <Icon name="flag" size={11} className="inline-block mr-1 align-text-bottom" aria-hidden="true" />
        Best-effort: reconstructed from work-package activity log.
      </div>
    </div>
  );
}

function VelocityChart({ projectId }) {
  const q = useVelocity(projectId, !!projectId);
  if (q.isLoading) {
    return (
      <div className={PANEL}>
        <div className={PANEL_HEADER}>
          <h3 className={PANEL_TITLE}>Velocity</h3>
          <LoadingPill label="loading velocity" />
        </div>
      </div>
    );
  }
  const data = q.data || { sprints: [], avg: 0 };
  const max = Math.max(50, ...data.sprints.map((s) => Math.max(s.committed, s.completed)));

  return (
    <div className={PANEL}>
      <div className={PANEL_HEADER}>
        <h3 className={PANEL_TITLE}>Velocity</h3>
        <span className={PANEL_SUB}>
          Last {data.sprints.length} closed sprint{data.sprints.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-3 text-xs text-fg-subtle">
          <span className="inline-flex items-center">
            <span className={SWATCH} style={{ background: "var(--accent-200)" }} />
            Committed
          </span>
          <span className="inline-flex items-center">
            <span className={SWATCH} style={{ background: "var(--accent)" }} />
            Completed
          </span>
        </div>
      </div>
      {data.sprints.length === 0 ? (
        <EmptyState
          title="No velocity yet"
          body="Velocity is calculated from closed sprints. Complete a sprint to see the chart."
        />
      ) : (
        <>
          <div className="relative px-6 pt-8 pb-4">
            {/* Avg line */}
            {data.avg > 0 && (
              <div
                className="absolute left-6 right-6 border-t border-dashed border-accent-200 pointer-events-none"
                style={{
                  bottom: `calc(16px + ${(data.avg / max) * 192}px)`,
                }}
              >
                <span className="absolute right-0 -top-4 px-1.5 py-0.5 rounded bg-accent-50 text-accent-700 text-[10px] font-semibold">
                  Avg {data.avg} pts
                </span>
              </div>
            )}
            <div className="flex items-end gap-6 h-48">
              {data.sprints.map((s) => (
                <div
                  key={s.sprintId}
                  className="flex-1 flex flex-col items-center gap-2 min-w-12"
                >
                  <div className="flex gap-1.5 items-end h-44 relative">
                    <div
                      className="w-7 rounded-t-md bg-accent-200 relative transition-[height] duration-300"
                      style={{ height: `${(s.committed / max) * 100}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-fg-subtle font-semibold whitespace-nowrap">
                        {s.committed}
                      </span>
                    </div>
                    <div
                      className="w-7 rounded-t-md bg-accent relative transition-[height] duration-300"
                      style={{ height: `${(s.completed / max) * 100}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-accent-700 font-bold whitespace-nowrap">
                        {s.completed}
                      </span>
                    </div>
                  </div>
                  <div
                    className="text-[11px] text-fg-muted font-medium max-w-24 text-center truncate"
                    title={s.sprintName}
                  >
                    {s.sprintName?.split(" — ")[0] || s.sprintName}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border-soft border-t border-border-soft">
            <div className="bg-surface-elevated px-5 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                Average
              </div>
              <div className="font-display text-lg font-bold text-fg mt-0.5">
                {data.avg} pts
              </div>
            </div>
            <div className="bg-surface-elevated px-5 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                Last sprint
              </div>
              <div className="font-display text-lg font-bold text-fg mt-0.5">
                {data.sprints[data.sprints.length - 1]?.completed ?? "—"} pts
              </div>
            </div>
            <div className="bg-surface-elevated px-5 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                Completion rate
              </div>
              <div className="font-display text-lg font-bold text-fg mt-0.5">
                {(() => {
                  const c = data.sprints.reduce((s, x) => s + (x.committed || 0), 0);
                  const d = data.sprints.reduce((s, x) => s + (x.completed || 0), 0);
                  return c > 0 ? `${Math.round((d / c) * 100)}%` : "—";
                })()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Reports({ sprint, projectId, tasks = [] }) {
  const sprintTasks = sprint ? tasks.filter((t) => t.sprint === sprint.id) : [];
  const totalIssues = sprintTasks.length;
  const totalPts = sprintTasks.reduce((s, t) => s + (t.points || 0), 0);
  const donePts = sprintTasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + (t.points || 0), 0);
  const progress = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;
  const daysLeft =
    sprint?.days != null && sprint?.dayIn != null
      ? Math.max(0, sprint.days - sprint.dayIn)
      : null;

  return (
    <div className="px-6 py-5">
      <div className="grid gap-4 max-w-275 mx-auto">
        {sprint && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              label="Sprint progress"
              value={`${progress}%`}
              sub={`${donePts} of ${totalPts} pts`}
            />
            <Stat
              label="Issues"
              value={totalIssues}
              sub={`${sprintTasks.filter((t) => t.status === "done").length} completed`}
            />
            <Stat
              label="Days remaining"
              value={daysLeft != null ? daysLeft : "—"}
              sub={
                sprint.days != null
                  ? `Day ${sprint.dayIn} of ${sprint.days}`
                  : "No dates set"
              }
            />
            <Stat label="Sprint" value={sprint.name?.split(" — ")[0] || "—"} sub={sprint.state} />
          </div>
        )}
        <Burndown projectId={projectId} sprint={sprint} />
        <VelocityChart projectId={projectId} />
      </div>
    </div>
  );
}
