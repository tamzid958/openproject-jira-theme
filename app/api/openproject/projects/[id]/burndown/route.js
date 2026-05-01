import { buildFilters, fetchAllPages, opFetch } from "@/lib/openproject/client";
import {
  elementsOf,
  mapActivity,
  mapVersionFull,
  mapWorkPackage,
} from "@/lib/openproject/mappers";
import {
  classifyVersionDetail,
  closedSprintMentions,
} from "@/lib/openproject/activity-parsing";
import { errorResponse } from "@/lib/openproject/route-utils";
import { makeCache } from "@/lib/openproject/route-cache";
import { isoDayOf, workingDaySet } from "@/lib/openproject/working-days";
import {
  inferModeFromTasks,
  unitFor,
  weightOf,
} from "@/lib/openproject/estimate";

export const dynamic = "force-dynamic";

const CACHE = makeCache({ ttlMs: 5 * 60 * 1000 });

// Hard cap on per-WP activity fetches per sprint. Prevents runaway requests
// on very large sprints; everything past the cap is silently skipped and the
// UI's best-effort tooltip already accounts for missing data.
const WP_FETCH_CAP = 200;

async function computeBurndown(projectId, sprintId) {
  const v = await opFetch(`/versions/${sprintId}`);
  const sprint = mapVersionFull(v);
  if (!sprint.start || !sprint.end || sprint.start === "—" || sprint.end === "—") {
    return {
      sprint,
      points: [],
      totalCommitted: 0,
      committedAtStart: 0,
      addedAfterStart: { count: 0, points: 0 },
      removedAfterStart: { count: 0, points: 0 },
      scopeEvents: [],
      carryOver: {},
      truncated: false,
      baselineSource: "none",
      mode: "numeric",
      unit: "pts",
    };
  }

  const versionsHal = await opFetch(
    `/projects/${encodeURIComponent(projectId)}/versions`,
  ).catch(() => null);
  const allVersions = elementsOf(versionsHal).map(mapVersionFull);
  const closedSprintNames = allVersions
    .filter((s) => s.status === "closed" && String(s.id) !== String(sprintId))
    .map((s) => s.name)
    .filter(Boolean);

  const filters = buildFilters([
    { version: { operator: "=", values: [sprintId] } },
  ]);

  // Current sprint members — points-of-truth for "what's in the sprint now".
  const currentEls = await fetchAllPages(
    `/projects/${encodeURIComponent(projectId)}/work_packages`,
    { filters },
  );
  const currentWps = currentEls.map((wp) => mapWorkPackage(wp));

  // Auto-detect the estimation mode from the WP set so the response can
  // tell the client which unit suffix to render ("pts" vs "d") and which
  // weight calculation to trust. Mode applies to every weightOf below.
  const mode = inferModeFromTasks(currentWps) || "numeric";
  const wOpts = { mode };

  // Baseline at sprint.start using OpenProject's native time-travel filter.
  // Falls back gracefully if the OP version doesn't expose `timestamps`.
  const baselineTs = `${sprint.start}T00:00:00Z`;
  let baselineWps = null;
  let baselineSource = "timestamps";
  try {
    const baselineEls = await fetchAllPages(
      `/projects/${encodeURIComponent(projectId)}/work_packages`,
      { filters, timestamps: baselineTs },
    );
    baselineWps = baselineEls.map((wp) => mapWorkPackage(wp));
  } catch {
    baselineWps = null;
    baselineSource = "fallback";
  }

  // Activities — drive day-level scope events + carry-over detection. Cap at
  // WP_FETCH_CAP to bound cost; degrade gracefully past the cap.
  const truncated = currentWps.length > WP_FETCH_CAP;
  const scanWps = truncated ? currentWps.slice(0, WP_FETCH_CAP) : currentWps;
  const perWp = await Promise.all(
    scanWps.map((t) =>
      opFetch(`/work_packages/${t.nativeId}/activities`)
        .then((aHal) => ({ wp: t, acts: elementsOf(aHal).map(mapActivity) }))
        .catch(() => null),
    ),
  );

  const transitions = [];
  const scopeEvents = [];
  const carryOver = {};

  for (const r of perWp) {
    if (!r) continue;
    const wpId = r.wp.nativeId;
    const wpKey = r.wp.key;
    const wpTitle = r.wp.title;
    const wpPoints = weightOf(r.wp, wOpts);
    const wpPointsRaw = r.wp.pointsRaw ?? null;
    const priorClosed = new Set();

    for (const a of r.acts) {
      const day = (a.createdAt || "").slice(0, 10);
      for (const detail of a.details || []) {
        if (/status/i.test(detail)) {
          transitions.push({ wpId, day, text: detail });
        }
        if (sprint.name) {
          const kind = classifyVersionDetail(detail, sprint.name);
          if (kind && day && day >= sprint.start && day <= sprint.end) {
            scopeEvents.push({
              wpId,
              wpKey,
              wpTitle,
              points: wpPoints,
              pointsRaw: wpPointsRaw,
              day,
              kind,
              by: a.authorName || null,
            });
          }
        }
        if (closedSprintNames.length > 0) {
          for (const name of closedSprintMentions(detail, closedSprintNames)) {
            priorClosed.add(name);
          }
        }
      }
    }

    if (priorClosed.size > 0) {
      carryOver[wpId] = {
        count: priorClosed.size,
        sprintNames: Array.from(priorClosed),
      };
    }
  }

  // ── Scope summary ─────────────────────────────────────────────────────
  // Prefer the timestamps baseline; fall back to journal-derived added set
  // when OP didn't return a baseline snapshot.
  let committedAtStart;
  let addedSet;
  let removedSet;
  if (baselineWps) {
    const baselineIds = new Set(baselineWps.map((w) => w.nativeId));
    const currentIds = new Set(currentWps.map((w) => w.nativeId));
    addedSet = new Set([...currentIds].filter((id) => !baselineIds.has(id)));
    removedSet = new Set([...baselineIds].filter((id) => !currentIds.has(id)));
    committedAtStart = baselineWps.reduce((s, w) => s + weightOf(w, wOpts), 0);
  } else {
    addedSet = new Set(
      scopeEvents.filter((e) => e.kind === "added").map((e) => e.wpId),
    );
    removedSet = new Set(
      scopeEvents
        .filter((e) => e.kind === "removed")
        .map((e) => e.wpId)
        .filter((id) => !currentWps.some((w) => w.nativeId === id)),
    );
    committedAtStart = currentWps.reduce(
      (s, w) => (addedSet.has(w.nativeId) ? s : s + weightOf(w, wOpts)),
      0,
    );
  }
  const addedPoints = currentWps
    .filter((w) => addedSet.has(w.nativeId))
    .reduce((s, w) => s + weightOf(w, wOpts), 0);
  const removedPoints = (baselineWps || [])
    .filter((w) => removedSet.has(w.nativeId))
    .reduce((s, w) => s + weightOf(w, wOpts), 0);

  // Itemized scope-events list. Cross-reference baseline so we surface
  // removed-and-not-readded WPs even when journal parsing missed them.
  const scopeEventIndex = new Map();
  for (const ev of scopeEvents) {
    scopeEventIndex.set(`${ev.wpId}:${ev.kind}:${ev.day}`, ev);
  }
  const itemized = [...scopeEvents];
  if (baselineWps) {
    for (const w of currentWps) {
      if (!addedSet.has(w.nativeId)) continue;
      // No journal event captured this addition — synthesize a placeholder
      // so the UI table still lists the WP. Day is unknown.
      const hasDay = scopeEvents.some(
        (e) => e.wpId === w.nativeId && e.kind === "added",
      );
      if (!hasDay) {
        itemized.push({
          wpId: w.nativeId,
          wpKey: w.key,
          wpTitle: w.title,
          points: weightOf(w, wOpts),
          pointsRaw: w.pointsRaw ?? null,
          day: null,
          kind: "added",
          by: null,
        });
      }
    }
    for (const w of baselineWps) {
      if (!removedSet.has(w.nativeId)) continue;
      const hasDay = scopeEvents.some(
        (e) => e.wpId === w.nativeId && e.kind === "removed",
      );
      if (!hasDay) {
        itemized.push({
          wpId: w.nativeId,
          wpKey: w.key,
          wpTitle: w.title,
          points: weightOf(w, wOpts),
          pointsRaw: w.pointsRaw ?? null,
          day: null,
          kind: "removed",
          by: null,
        });
      }
    }
  }

  // ── Day walk + per-day remaining ──────────────────────────────────────
  const wdays = workingDaySet();
  const start = new Date(sprint.start);
  const end = new Date(sprint.end);
  const today = new Date();
  const stop = today < end ? today : end;
  const days = [];
  for (let d = new Date(start); d <= stop; d.setDate(d.getDate() + 1)) {
    days.push({
      day: isoDayOf(d),
      isWorkingDay: wdays.has(d.getUTCDay()),
    });
  }

  // Day a WP became "done".
  const doneBy = new Map();
  for (const tr of transitions) {
    if (/done|closed|resolved/i.test(tr.text)) {
      const cur = doneBy.get(tr.wpId);
      if (!cur || tr.day < cur) doneBy.set(tr.wpId, tr.day);
    }
  }
  for (const t of currentWps) {
    if (t.status === "done" && !doneBy.has(t.nativeId)) {
      doneBy.set(t.nativeId, sprint.start);
    }
  }

  // Day a WP joined this sprint, when it was added mid-sprint.
  const joinedBy = new Map();
  for (const ev of scopeEvents) {
    if (ev.kind !== "added") continue;
    const cur = joinedBy.get(ev.wpId);
    if (!cur || ev.day < cur) joinedBy.set(ev.wpId, ev.day);
  }

  const points = days.map(({ day, isWorkingDay }) => {
    let remaining = 0;
    for (const t of currentWps) {
      const joined = joinedBy.get(t.nativeId) || sprint.start;
      if (joined > day) continue;
      const done = doneBy.get(t.nativeId);
      if (done && done <= day) continue;
      remaining += weightOf(t, wOpts);
    }
    return { day, remaining, isWorkingDay };
  });

  const totalCommitted = currentWps.reduce((s, t) => s + weightOf(t, wOpts), 0);

  return {
    sprint,
    points,
    totalCommitted,
    committedAtStart,
    addedAfterStart: { count: addedSet.size, points: addedPoints },
    removedAfterStart: { count: removedSet.size, points: removedPoints },
    scopeEvents: itemized.sort(
      (a, b) => (a.day || "").localeCompare(b.day || ""),
    ),
    carryOver,
    truncated,
    baselineSource,
    mode,
    unit: unitFor(mode),
  };
}

export async function GET(req, ctx) {
  try {
    const { id } = await ctx.params;
    const sprintId = new URL(req.url).searchParams.get("sprint");
    if (!sprintId) {
      return Response.json({ error: "sprint param is required" }, { status: 400 });
    }
    const key = `${id}:${sprintId}`;
    const cached = CACHE.get(key);
    if (cached) return Response.json(cached);
    const value = await computeBurndown(id, sprintId);
    CACHE.set(key, value);
    return Response.json(value);
  } catch (e) {
    return errorResponse(e);
  }
}
