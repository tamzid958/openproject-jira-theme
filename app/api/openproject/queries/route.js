import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapQuery } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/queries?projectId=&starredOnly=
//
// OpenProject Queries are saved filters/sorts/columns/group-bys. The list is
// scoped per user (your starred + public) and per project when projectId is
// supplied. The viewer's permissions decide which actions appear in `_links`.
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const starredOnly = url.searchParams.get("starredOnly") === "1";

    const filters = [];
    if (projectId) {
      filters.push({ project: { operator: "=", values: [String(projectId)] } });
    }
    if (starredOnly) {
      filters.push({ starred: { operator: "=", values: ["t"] } });
    }
    const path = withQuery("/queries", {
      pageSize: "200",
      filters: buildFilters(filters),
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapQuery));
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/openproject/queries
// Body: { name, projectId?, public?, filters?, sortBy?, columns?, groupBy? }
//
// Create a saved query. Pass-through to OP — the consuming UI (Save current
// view dialog) is expected to send the canonical OP shape (filters as the
// HAL filter array, columns as link refs).
export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    const body = {
      name: data.name,
      public: !!data.public,
      filters: data.filters || [],
      sortBy: data.sortBy || [],
      groupBy: data.groupBy || null,
      _links: {},
    };
    if (data.projectId) {
      body._links.project = { href: `/api/v3/projects/${data.projectId}` };
    }
    if (Array.isArray(data.columns)) {
      body._links.columns = data.columns.map((c) => ({
        href: `/api/v3/queries/columns/${c}`,
      }));
    }
    const created = await opFetch("/queries", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapQuery(created));
  } catch (e) {
    return errorResponse(e);
  }
}
