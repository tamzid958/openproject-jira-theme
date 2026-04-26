import { opFetch, withQuery } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { elementsOf, mapUser } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

// Project-scoped assignee list — OpenProject's
// /api/v3/projects/{id}/available_assignees only returns principals who
// can be set as assignee on a WP in this project (i.e. members + groups).
// Used to drive the project-aware assignee picker.
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery(`/projects/${encodeURIComponent(id)}/available_assignees`, {
      pageSize: "200",
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapUser).filter(Boolean));
  } catch (e) {
    return errorResponse(e);
  }
}
