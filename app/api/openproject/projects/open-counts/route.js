import { buildFilters, opFetch, withQuery } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Per-project open work-package count. We ask OpenProject to group the
// collection by project and return zero rows (`pageSize=0`) — the response
// then carries `_embedded.groups[]` with `count` per project, so we get an
// exact tally in a single tiny request instead of paginating through every
// open WP on the instance.
export async function GET() {
  try {
    const path = withQuery("/work_packages", {
      filters: buildFilters([{ status: { operator: "o", values: [] } }]),
      groupBy: "project",
      pageSize: 0,
    });
    const hal = await opFetch(path);
    const groups = hal?._embedded?.groups || [];
    const counts = {};
    for (const g of groups) {
      const href = g?._links?.valueLink?.[0]?.href || g?._links?.value?.href || "";
      const last = href.split("/").pop();
      if (!last) continue;
      const n = Number(g?.count ?? 0) || 0;
      counts[last] = (counts[last] || 0) + n;
    }
    return Response.json(counts);
  } catch (e) {
    return errorResponse(e);
  }
}
