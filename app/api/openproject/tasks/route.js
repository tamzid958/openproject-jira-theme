import { fetchAllPages, opFetch, withQuery, buildFilters } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import {
  buildCreateBody,
  elementsOf,
  mapProject,
  mapWorkPackage,
} from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

async function loadProjectKeyMap() {
  // Build the href→key index used to derive prototype task keys (e.g. WA-241).
  // Cached per-request only; OpenProject project lists are usually small.
  const hal = await opFetch(withQuery("/projects", { pageSize: "200" }));
  const map = {};
  for (const p of elementsOf(hal)) {
    const proto = mapProject(p);
    map[`/api/v3/projects/${p.id}`] = proto.key;
    map[`/api/v3/projects/${p.identifier}`] = proto.key;
  }
  return map;
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("project");
    const sprintId = url.searchParams.get("sprint");

    // Sprint filter shape per OP v3 spec:
    //   - specific version → operator "=", values [String(id)]
    //   - "no version" / backlog → operator "!*" (none-of-the-above)
    //   - "all" / unset → still send `filters=[]` so OP doesn't apply its
    //     default "open status only" filter — we want closed WPs too so
    //     closed sprints show their members and the UI can delete them.
    const localFilters = [];
    if (sprintId === "backlog" || sprintId === "none") {
      localFilters.push({ version: { operator: "!*", values: [] } });
    } else if (sprintId && sprintId !== "all") {
      localFilters.push({ version: { operator: "=", values: [String(sprintId)] } });
    }

    const params = { filters: buildFilters(localFilters) ?? "[]" };

    const basePath = projectId
      ? `/projects/${encodeURIComponent(projectId)}/work_packages`
      : "/work_packages";

    const [wps, keyMap] = await Promise.all([
      fetchAllPages(basePath, params, { hardCap: 5000 }),
      loadProjectKeyMap(),
    ]);
    const tasks = wps.map((wp) => mapWorkPackage(wp, { projectKeyByHref: keyMap }));
    return Response.json(tasks);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId } = body;
    if (!projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 });
    }
    const payload = buildCreateBody(body, { projectId });
    const wp = await opFetch(`/projects/${encodeURIComponent(projectId)}/work_packages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // Derive the project key locally from the known projectId — no need to
    // GET /projects?pageSize=200 just to learn the prefix for one entry.
    const proto = mapProject({ identifier: projectId });
    const keyMap = {};
    const projectHref = wp._links?.project?.href;
    if (projectHref) keyMap[projectHref] = proto.key;
    return Response.json(mapWorkPackage(wp, { projectKeyByHref: keyMap }));
  } catch (e) {
    return errorResponse(e);
  }
}
