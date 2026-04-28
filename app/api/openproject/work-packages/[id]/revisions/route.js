import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapRevision } from "@/lib/openproject/mappers";
import { errorResponse, nativeId } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/work-packages/<id>/revisions
//
// Returns SCM commits whose message referenced this WP id (e.g. via
// `fixes #1234`). The viewer must hold `view_changesets` on the defining
// project, otherwise OP returns an empty list — surfaced as `[]`, not 403.
export async function GET(_req, ctx) {
  try {
    const { id } = await ctx.params;
    const path = withQuery(`/work_packages/${nativeId(id)}/revisions`, {
      pageSize: "200",
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapRevision));
  } catch (e) {
    return errorResponse(e);
  }
}
