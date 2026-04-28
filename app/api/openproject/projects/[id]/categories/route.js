import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapCategory } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery(`/projects/${encodeURIComponent(id)}/categories`, {
      pageSize: "200",
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapCategory));
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/openproject/projects/<id>/categories
// Body: { name, defaultAssigneeId? }
//
// OP doesn't expose a project-scoped POST in the v3 spec — categories are
// created at the top-level /categories endpoint with a project link. We do
// the right thing for the caller (which sees a project-scoped surface).
export async function POST(req, ctx) {
  try {
    const { id } = await ctx.params;
    const data = await req.json();
    if (!data.name) return Response.json({ error: "name required" }, { status: 400 });
    const body = {
      name: data.name,
      _links: { project: { href: `/api/v3/projects/${id}` } },
    };
    if (data.defaultAssigneeId) {
      body._links.defaultAssignee = {
        href: `/api/v3/users/${data.defaultAssigneeId}`,
      };
    }
    const c = await opFetch("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(mapCategory(c));
  } catch (e) {
    return errorResponse(e);
  }
}

