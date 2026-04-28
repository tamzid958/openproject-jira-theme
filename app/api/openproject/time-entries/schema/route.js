import { opFetch } from "@/lib/openproject/client";
import { errorResponse } from "@/lib/openproject/route-utils";

export const dynamic = "force-dynamic";

// GET /api/openproject/time-entries/schema
//
// Returns OP's HAL Schema for time entries — used by the form to discover
// which fields are required, what activities/projects are allowed, and any
// custom fields enabled on this install. We forward it raw so the form can
// decide what to render without us having to mirror every shape change.
export async function GET() {
  try {
    const schema = await opFetch("/time_entries/schema");
    return Response.json(schema);
  } catch (e) {
    return errorResponse(e);
  }
}
