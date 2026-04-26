import { opFetch, withQuery } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";
import { elementsOf, mapRole } from "@/lib/openproject/mappers";

export const dynamic = "force-dynamic";

// Read-only roles list — used to power the role multi-select on the
// Members page. Filters out the "Anonymous" / "Non member" built-ins
// since they can't be assigned to a project membership.
export async function GET() {
  try {
    const path = withQuery("/roles", { pageSize: "200" });
    const hal = await opFetch(path);
    const roles = elementsOf(hal)
      .map(mapRole)
      .filter((r) => {
        const n = (r.name || "").toLowerCase();
        return n !== "anonymous" && n !== "non member";
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return Response.json(roles);
  } catch (e) {
    return errorResponse(e);
  }
}
