import { opFetch, withQuery } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { elementsOf, mapVersionToSprint } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

// Returns every version (open / locked / closed) — the client decides
// which to surface. Previously the no-project branch added a status=open
// filter while the project branch returned everything, so the same UI
// could show different sets depending on context.
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("project");
    const path = projectId
      ? withQuery(`/projects/${encodeURIComponent(projectId)}/versions`, { pageSize: "100" })
      : withQuery("/versions", { pageSize: "100" });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapVersionToSprint));
  } catch (e) {
    return errorResponse(e);
  }
}
