import { opFetch, withQuery, buildFilters } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { elementsOf, mapProject } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const pageSize = url.searchParams.get("pageSize") || "100";
    const filtersParam = url.searchParams.get("filters");
    const path = withQuery("/projects", {
      pageSize,
      filters: filtersParam ? filtersParam : buildFilters([{ active: { operator: "=", values: ["t"] } }]),
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapProject));
  } catch (e) {
    return errorResponse(e);
  }
}
