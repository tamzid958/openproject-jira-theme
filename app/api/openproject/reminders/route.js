import { opFetch, withQuery } from "@/lib/openproject/client";
import { elementsOf, mapReminder } from "@/lib/openproject/mappers";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/reminders
//
// Lists the current user's reminders (upcoming + past). The OP /reminders
// endpoint is implicitly viewer-scoped — no extra filter needed.
export async function GET() {
  try {
    const path = withQuery("/reminders", {
      pageSize: "200",
      sortBy: JSON.stringify([["remindAt", "asc"]]),
    });
    const hal = await opFetch(path);
    return Response.json(elementsOf(hal).map(mapReminder));
  } catch (e) {
    return errorResponse(e);
  }
}
