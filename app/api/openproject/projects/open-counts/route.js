import { buildFilters, fetchAllPages } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Per-project open work-package count, keyed by the trailing segment of the
// project link (numeric id and/or identifier). Walks all pages so the total
// is exact even on large instances; capped at 5k WPs to keep one request
// bounded.
export async function GET() {
  try {
    const els = await fetchAllPages(
      "/work_packages",
      { filters: buildFilters([{ status: { operator: "o", values: [] } }]) },
      { hardCap: 5000 },
    );
    const counts = {};
    for (const wp of els) {
      const href = wp._links?.project?.href || "";
      const last = href.split("/").pop();
      if (!last) continue;
      counts[last] = (counts[last] || 0) + 1;
    }
    return Response.json(counts);
  } catch (e) {
    return errorResponse(e);
  }
}
