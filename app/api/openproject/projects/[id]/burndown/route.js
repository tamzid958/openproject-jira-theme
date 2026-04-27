import { buildFilters, fetchAllPages, opFetch } from "@/lib/openproject/client";
import { elementsOf, mapActivity, mapVersionFull, mapWorkPackage } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

const TTL_MS = 5 * 60 * 1000;
const CACHE = new Map();

// Reconstruct burndown from per-WP status-change activities.
// For each day in the sprint, sum story points of WPs whose status was NOT
// "done" at the end of that day. We approximate "done" via classifyStatus
// already done in the mapper.
async function computeBurndown(projectId, sprintId) {
  const v = await opFetch(`/versions/${sprintId}`);
  const sprint = mapVersionFull(v);
  if (!sprint.start || !sprint.end || sprint.start === "—" || sprint.end === "—") {
    return { sprint, points: [], totalCommitted: 0 };
  }

  const wpEls = await fetchAllPages(
    `/projects/${encodeURIComponent(projectId)}/work_packages`,
    { filters: buildFilters([{ version: { operator: "=", values: [sprintId] } }]) },
  );
  const wps = wpEls.map((wp) => mapWorkPackage(wp));

  const transitions = [];
  const perWp = await Promise.all(
    wps.map((t) =>
      opFetch(`/work_packages/${t.nativeId}/activities`)
        .then((aHal) => ({ wpId: t.nativeId, acts: elementsOf(aHal).map(mapActivity) }))
        .catch(() => null),
    ),
  );
  for (const r of perWp) {
    if (!r) continue;
    for (const a of r.acts) {
      if (a.details.some((d) => /status/i.test(d))) {
        transitions.push({ wpId: r.wpId, day: (a.createdAt || "").slice(0, 10), text: a.details.join(" ") });
      }
    }
  }

  // Walk days from start → min(end, today). For each day, points-remaining =
  // sum of (points of WPs whose final status by that day wasn't "done").
  const start = new Date(sprint.start);
  const end = new Date(sprint.end);
  const today = new Date();
  const stop = today < end ? today : end;
  const days = [];
  for (let d = new Date(start); d <= stop; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  // For each WP, determine the day it became "done" (if ever).
  const doneBy = new Map();
  for (const tr of transitions) {
    if (/done|closed|resolved/i.test(tr.text)) {
      const cur = doneBy.get(tr.wpId);
      if (!cur || tr.day < cur) doneBy.set(tr.wpId, tr.day);
    }
  }
  // For WPs whose current status is "done" but no activity captured the
  // transition, treat them as done since the sprint start (best-effort).
  for (const t of wps) {
    if (t.status === "done" && !doneBy.has(t.nativeId)) {
      doneBy.set(t.nativeId, sprint.start);
    }
  }

  const totalCommitted = wps.reduce((s, t) => s + (t.points || 0), 0);
  const points = days.map((day) => {
    let remaining = 0;
    for (const t of wps) {
      const d = doneBy.get(t.nativeId);
      const isDoneByDay = d && d <= day;
      if (!isDoneByDay) remaining += t.points || 0;
    }
    return { day, remaining };
  });

  return { sprint, points, totalCommitted };
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
    if (cached && Date.now() - cached.t < TTL_MS) {
      return Response.json(cached.value);
    }
    const value = await computeBurndown(id, sprintId);
    CACHE.set(key, { t: Date.now(), value });
    return Response.json(value);
  } catch (e) {
    return errorResponse(e);
  }
}
