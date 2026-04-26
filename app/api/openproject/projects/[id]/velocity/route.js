import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapVersionFull, mapWorkPackage } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

const TTL_MS = 5 * 60 * 1000;
const CACHE = new Map();

async function computeVelocity(projectId) {
  // 1. List all versions on the project, keep the most-recent closed ones.
  const versionsHal = await opFetch(
    withQuery(`/projects/${encodeURIComponent(projectId)}/versions`, { pageSize: "200" }),
  );
  const versions = elementsOf(versionsHal).map(mapVersionFull);
  const closed = versions
    .filter((v) => v.state === "closed" && v.end && v.end !== "—")
    .sort((a, b) => (a.end < b.end ? 1 : -1))
    .slice(0, 5)
    .reverse();

  // 2. For each closed version, sum committed/completed story points.
  const out = [];
  for (const v of closed) {
    const wpHal = await opFetch(
      withQuery(`/projects/${encodeURIComponent(projectId)}/work_packages`, {
        pageSize: "300",
        filters: buildFilters([{ version: { operator: "=", values: [v.id] } }]),
      }),
    );
    const wps = elementsOf(wpHal).map((wp) => mapWorkPackage(wp));
    const committed = wps.reduce((s, t) => s + (t.points || 0), 0);
    const completed = wps
      .filter((t) => t.status === "done")
      .reduce((s, t) => s + (t.points || 0), 0);
    out.push({
      sprintId: v.id,
      sprintName: v.name,
      endDate: v.end,
      committed,
      completed,
    });
  }
  const avg = out.length
    ? Math.round(out.reduce((s, x) => s + x.completed, 0) / out.length)
    : 0;
  return { sprints: out, avg };
}

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const cached = CACHE.get(id);
    if (cached && Date.now() - cached.t < TTL_MS) {
      return Response.json(cached.value);
    }
    const value = await computeVelocity(id);
    CACHE.set(id, { t: Date.now(), value });
    return Response.json(value);
  } catch (e) {
    return errorResponse(e);
  }
}
