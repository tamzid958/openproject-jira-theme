import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapProject } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// Subset of /projects the current user can manage memberships in. Used by
// "Add member" pickers to scope the project dropdown.
export async function GET() {
  try {
    const hal = await opFetch(withQuery("/memberships/available_projects", { pageSize: "200" }));
    return Response.json(elementsOf(hal).map(mapProject));
  } catch (e) {
    return errorResponse(e);
  }
}
