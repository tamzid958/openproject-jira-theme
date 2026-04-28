import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapTimeEntryActivity } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/time-entry-activities
//
// OpenProject exposes this as `/time_entries/activities` (the "activity"
// dropdown on a time-entry form: "Development", "Meeting", "Design", etc).
// Listed globally — they are configured in OP admin, not per project.
export async function GET() {
  try {
    const hal = await opFetch(withQuery("/time_entries/activities", { pageSize: "100" }));
    return Response.json(elementsOf(hal).map(mapTimeEntryActivity));
  } catch (e) {
    return errorResponse(e);
  }
}
