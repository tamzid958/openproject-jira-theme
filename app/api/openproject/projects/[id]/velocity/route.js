import { buildFilters, fetchAllPages, opFetch, withQuery } from "@/lib/openproject/client";
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

  // For each closed sprint, fetch the WPs as they were AT SPRINT END so a
  // post-close points resize ("we bumped this from M to L last week")
  // doesn't retroactively rewrite the historical velocity. Falls back to
  // the live state if the OP install doesn't expose the `timestamps`
  // filter, which we tag per-sprint so the UI can flag approximate data.
  const out = await Promise.all(
    closed.map(async (v) => {
      const filters = buildFilters([{ version: { operator: "=", values: [v.id] } }]);
      const ts = `${v.end}T23:59:59Z`;
      let wpEls;
      let timeTraveled = false;
      try {
        wpEls = await fetchAllPages(
          `/projects/${encodeURIComponent(projectId)}/work_packages`,
          { filters, timestamps: ts },
        );
        timeTraveled = true;
      } catch {
        wpEls = await fetchAllPages(
          `/projects/${encodeURIComponent(projectId)}/work_packages`,
          { filters },
        );
      }
      const wps = wpEls.map((wp) => mapWorkPackage(wp));
      const committed = wps.reduce((s, t) => s + (t.points || 0), 0);
      const completed = wps
        .filter((t) => t.status === "done")
        .reduce((s, t) => s + (t.points || 0), 0);
      return {
        sprintId: v.id,
        sprintName: v.name,
        endDate: v.end,
        committed,
        completed,
        snapshot: timeTraveled ? "sprintEnd" : "live",
      };
    }),
  );
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
