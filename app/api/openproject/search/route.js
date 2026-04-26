import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapProject, mapUser, mapWorkPackage } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Cross-entity search powering the ⌘K command palette. Runs three filtered
// requests in parallel and returns grouped results.
export async function GET(req) {
  try {
    const q = (new URL(req.url).searchParams.get("q") || "").trim();
    if (!q) return Response.json({ projects: [], workPackages: [], users: [] });

    const [projectsHal, wpsHal, usersHal] = await Promise.all([
      opFetch(
        withQuery("/projects", {
          pageSize: "10",
          filters: buildFilters([{ name_and_identifier: { operator: "~", values: [q] } }]),
        }),
      ).catch(() => ({})),
      opFetch(
        withQuery("/work_packages", {
          pageSize: "15",
          filters: buildFilters([{ subjectOrId: { operator: "**", values: [q] } }]),
        }),
      ).catch(() => ({})),
      opFetch(
        withQuery("/users", {
          pageSize: "10",
          filters: buildFilters([{ name: { operator: "~", values: [q] } }]),
        }),
      ).catch(() => ({})),
    ]);

    return Response.json({
      projects: elementsOf(projectsHal).map(mapProject),
      workPackages: elementsOf(wpsHal).map((wp) => mapWorkPackage(wp)),
      users: elementsOf(usersHal).map(mapUser).filter(Boolean),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
