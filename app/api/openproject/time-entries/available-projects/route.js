import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapProject } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/time-entries/available-projects
//
// Subset of /projects the current user can log time in (i.e. holds the
// `log_own_time` permission on). The "Log time" modal uses this to scope its
// project picker so the user can't pick a project they'd be rejected on.
export async function GET() {
  try {
    const hal = await opFetch(withQuery("/time_entries/available_projects", { pageSize: "200" }));
    return Response.json(elementsOf(hal).map(mapProject));
  } catch (e) {
    return errorResponse(e);
  }
}
