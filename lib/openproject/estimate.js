// Centralized estimation accessor. Three estimation models live in one
// place so every aggregation, every chart, and every chip in the app reads
// from the same contract:
//
//   1. Numeric story points     — task.points already numeric; label is the number.
//   2. T-shirt sizes            — task.points is the mapped numeric (M=3, L=5),
//                                 task.pointsRaw is the human label ("L").
//   3. Date-range duration      — task.startDate + task.dueDate count working days
//                                 between them; no points are required.
//
// `weightOf(task)` is what aggregations sum.
// `labelOf(task)` / `formatEstimate(task)` is what chips render.
// `sourceOf(task, mode)` tells UI which picker to surface.
//
// The mapper already populates `task.points`, `task.pointsRaw`, `task.startDate`,
// `task.dueDate`, and `task.estimatedHours`. This module is a pure derivation
// layer — no schema lookups happen here. The auto-detected per-project mode
// is supplied by `useEstimateMode` (client) or `getEstimateMode` (server).

import { workingDaySet } from "./working-days";

export { formatPoints } from "./story-points-constants";

// Inclusive working-day count between two ISO dates. Returns 0 when either
// is missing or the range is inverted. Respects the project's working-day
// mask via NEXT_PUBLIC_OPENPROJECT_WORKING_DAYS.
export function workingDaysBetween(startIso, endIso, mask) {
  if (!startIso || !endIso) return 0;
  if (startIso === "—" || endIso === "—") return 0;
  const wd = mask || workingDaySet();
  const start = new Date(`${String(startIso).slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${String(endIso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end.getTime() < start.getTime()) return 0;
  let count = 0;
  for (
    const d = new Date(start);
    d.getTime() <= end.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if (wd.has(d.getUTCDay())) count += 1;
  }
  return count;
}

// Numeric weight used by every aggregation (sums, averages, charts).
//
// Modes:
//   mode unset / "numeric" / "tshirt"  — points only; missing → 0.
//                                         Identical to the legacy `t.points || 0`
//                                         expression every aggregation used to use.
//   mode = "duration"                   — skip points entirely; weight =
//                                         workingDaysBetween(startDate, dueDate).
//   mode = "hybrid"                     — points first; if missing, fall back to
//                                         workingDaysBetween. The auto-detected
//                                         per-project mode the user can opt in to
//                                         when running mixed projects.
//
// The default is the legacy behaviour so Wave A is a pure refactor — every
// existing aggregation continues to produce the same number it did yesterday.
// Hybrid + duration are opted into by passing `mode` explicitly.
export function weightOf(task, opts = {}) {
  if (!task) return 0;
  const { mode = "legacy", workingDayMask } = opts;
  if (mode === "duration") {
    return workingDaysBetween(task.startDate, task.dueDate, workingDayMask);
  }
  if (typeof task.points === "number" && Number.isFinite(task.points)) {
    return task.points;
  }
  if (mode === "hybrid") {
    return workingDaysBetween(task.startDate, task.dueDate, workingDayMask);
  }
  return 0;
}

// Display label for chips and per-WP rows. Returns null when nothing to show
// (caller usually renders a "—" placeholder).
//
//   tshirt project, points=5, pointsRaw="L"  → "L"
//   numeric project, points=5                 → "5"
//   duration mode, 3 working days             → "3d"
//   no estimate                                → null
//
// Default mode is "legacy": prefer pointsRaw, fall back to points, no date
// fallback. This matches the existing formatPoints behaviour exactly so
// Wave A is a pure rename.
export function labelOf(task, opts = {}) {
  if (!task) return null;
  const { mode = "legacy", workingDayMask } = opts;

  if (mode === "duration") {
    const days = workingDaysBetween(task.startDate, task.dueDate, workingDayMask);
    return days > 0 ? `${days}d` : null;
  }

  if (task.pointsRaw != null && task.pointsRaw !== "") {
    return String(task.pointsRaw);
  }
  if (typeof task.points === "number" && Number.isFinite(task.points)) {
    return String(task.points);
  }

  if (mode === "hybrid") {
    const days = workingDaysBetween(task.startDate, task.dueDate, workingDayMask);
    return days > 0 ? `${days}d` : null;
  }
  return null;
}

// Alias so call sites that used to read `formatPoints(task)` can switch to
// `formatEstimate(task)` with no behavioural diff on numeric/tshirt projects.
export function formatEstimate(task, opts) {
  return labelOf(task, opts);
}

// Which estimation source is actually contributing for this task. Drives
// picker selection in EstimatePicker and lets reports surface "by source"
// breakdowns later.
export function sourceOf(task, opts = {}) {
  if (!task) return null;
  const { mode = "hybrid" } = opts;
  if (mode === "duration") {
    return task.startDate && task.dueDate ? "duration" : null;
  }
  if (task.pointsRaw != null && task.pointsRaw !== "") {
    return mode === "numeric" ? "numeric" : "tshirt";
  }
  if (typeof task.points === "number" && Number.isFinite(task.points)) {
    return "numeric";
  }
  if (task.startDate && task.dueDate) return "duration";
  return null;
}

// Display-suffix helper. Reports + sprint headers use this to decide
// whether a sum reads "27 pts" or "27d".
//   mode="numeric"|"tshirt" → "pts"
//   mode="duration"          → "d"
//   mode unset / "hybrid"    → "pts" (the historical default; flips to "d"
//                              only when reports are scoped to a duration
//                              project, which they detect via the unit
//                              field returned by the API routes in Wave B).
export function unitFor(mode) {
  return mode === "duration" ? "d" : "pts";
}

// Server-side helper: given a fetched WP list, guess the project's
// estimation mode from the data alone. Used by the burndown / velocity /
// capacity routes so the response can carry a `unit` field without paying
// for a separate schema round-trip. Mirrors the data-fallback branch in
// the client useEstimateMode hook.
//
// Precedence:
//   any task with a non-numeric pointsRaw → "tshirt"
//   any task with a numeric points        → "numeric"
//   no points anywhere but at least one
//     task with both startDate and dueDate → "duration"
//   nothing at all                          → null (caller decides default)
export function inferModeFromTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  let hasTshirt = false;
  let hasNumeric = false;
  let hasDates = false;
  for (const t of tasks) {
    if (t.pointsRaw != null && t.pointsRaw !== "") {
      const asNum = Number(t.pointsRaw);
      if (Number.isNaN(asNum)) {
        hasTshirt = true;
      } else {
        hasNumeric = true;
      }
    } else if (typeof t.points === "number" && Number.isFinite(t.points)) {
      hasNumeric = true;
    }
    if (t.startDate && t.dueDate) hasDates = true;
  }
  if (hasTshirt) return "tshirt";
  if (hasNumeric) return "numeric";
  if (hasDates) return "duration";
  return null;
}
