import { opFetch, withQuery } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { elementsOf, mapType } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

// When `?project=<id>` is present, only return WP types enabled for that
// project (OpenProject's per-project type config). Otherwise return the
// global type list.
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get("project");
    const path = project
      ? `/projects/${encodeURIComponent(project)}/types`
      : withQuery("/types", { pageSize: "100" });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapType));
  } catch (e) {
    return errorResponse(e);
  }
}
